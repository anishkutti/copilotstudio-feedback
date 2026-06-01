import { FeedbackItem, TranscriptActivity, TranscriptContent } from "../types";

/**
 * Normalizes feedback data by replacing escaped unicode sequences (\u0022, etc.)
 * with their actual character equivalents. This handles cases where feedback JSON
 * is double-encoded with escaped quotes.
 */
function normalizeUnicodeEscapes(value: unknown): unknown {
  if (typeof value === "string") {
    // Replace all \uXXXX sequences with their actual characters
    try {
      const unescaped = value.replace(/\\u([0-9A-Fa-f]{4})/g, (_match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      // Try to parse as JSON if it looks like JSON
      if (unescaped.startsWith("{") || unescaped.startsWith("[")) {
        return JSON.parse(unescaped);
      }
      return unescaped;
    } catch {
      return value;
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      normalized[key] = normalizeUnicodeEscapes(val);
    }
    return normalized;
  }
  return value;
}

/**
 * Safely extracts feedback text from the feedback object, handling cases where
 * the feedback might be a string with escaped unicode characters.
 */
function extractFeedbackText(feedbackValue: unknown): string {
  if (!feedbackValue) return "";

  // First normalize any unicode escapes
  const normalized = normalizeUnicodeEscapes(feedbackValue);

  // Try to access feedbackText from the normalized object
  if (
    typeof normalized === "object" &&
    normalized !== null &&
    "feedbackText" in normalized
  ) {
    const text = (normalized as Record<string, unknown>).feedbackText;
    return typeof text === "string" ? text : "";
  }

  // If normalized is still a string, try one more parse attempt
  if (typeof normalized === "string") {
    try {
      const parsed = JSON.parse(normalized);
      if (typeof parsed === "object" && parsed !== null && "feedbackText" in parsed) {
        return typeof parsed.feedbackText === "string" ? parsed.feedbackText : "";
      }
    } catch {
      // Return the string as-is if it's not valid JSON
      return normalized;
    }
  }

  return "";
}

/**
 * Parses a conversation transcript JSON string and extracts all feedback items.
 *
 * Feedback is identified by activities with:
 *   type === "invoke", name === "message/submitAction", value.actionName === "feedback"
 *
 * The agent message the feedback refers to is resolved via the activity's replyToId,
 * which points to a "message" activity from the bot (role 0).
 */
export function extractFeedback(
  transcriptId: string,
  content: string,
  agentName: string
): FeedbackItem[] {
  let parsed: TranscriptContent;
  try {
    parsed = JSON.parse(content) as TranscriptContent;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.activities)) return [];

  // Build lookup map: activity id → activity
  const activityMap = new Map<string, TranscriptActivity>();
  for (const activity of parsed.activities) {
    if (activity.id) {
      activityMap.set(activity.id, activity);
    }
  }

  const feedbackItems: FeedbackItem[] = [];
  let feedbackIndex = 0;

  for (const activity of parsed.activities) {
    if (
      activity.type === "invoke" &&
      activity.name === "message/submitAction" &&
      activity.value?.actionName === "feedback"
    ) {
      const feedbackText = extractFeedbackText(activity.value.actionValue?.feedback);
      const reaction = activity.value.actionValue?.reaction ?? "";

      // Resolve the agent message this feedback is attached to via replyToId
      // Then walk one more level up to the original user message.
      let agentMessage = "";
      let requestedPrompt = "";
      let replyTime = "";
      let startTime = "";
      if (activity.replyToId) {
        const referenced = activityMap.get(activity.replyToId);
        if (referenced) {
          // Prefer the full spoken text; fall back to the display text
          agentMessage = referenced.speak ?? referenced.text ?? "";

          const referencedTimestampMs =
            referenced.timestampMs ??
            (referenced.timestamp != null ? referenced.timestamp * 1000 : null);
          replyTime =
            referencedTimestampMs != null
              ? new Date(referencedTimestampMs).toISOString()
              : "";

          // If the referenced bot message refers to an earlier user message,
          // use that deeper message text as the requested prompt.
          if (referenced.type === "message" && referenced.replyToId) {
            const originalRequest = activityMap.get(referenced.replyToId);
            if (originalRequest?.type === "message") {
              requestedPrompt = originalRequest.text ?? "";
              const originalTimestampMs =
                originalRequest.timestampMs ??
                (originalRequest.timestamp != null ? originalRequest.timestamp * 1000 : null);
              startTime =
                originalTimestampMs != null
                  ? new Date(originalTimestampMs).toISOString()
                  : "";
            }
          }

          // Fall back to the referenced activity if there is no deeper user message.
          if (!requestedPrompt) {
            requestedPrompt = referenced.text ?? "";
            if (!startTime) {
              startTime = replyTime;
            }
          }
        }
      }

      // Derive timestamp: timestampMs is in ms, timestamp is in seconds
      const timestampMs =
        activity.timestampMs ??
        (activity.timestamp != null ? activity.timestamp * 1000 : null);

      feedbackItems.push({
        id: `${transcriptId}-${activity.id ?? String(feedbackIndex)}`,
        agentName,
        feedbackText,
        reaction,
        agentMessage,
        requestedPrompt,
        replyTime,
        startTime,
        timestamp: timestampMs != null ? new Date(timestampMs).toISOString() : "",
        transcriptId,
      });

      feedbackIndex++;
    }
  }

  return feedbackItems;
}

import * as XLSX from "xlsx";
import { FeedbackItem } from "../types";

export function exportFeedbackToExcel(
  items: FeedbackItem[],
  filename: string = "feedback-export.xlsx"
): void {
  if (items.length === 0) {
    alert("No data to export");
    return;
  }

  // Transform feedback items to a format suitable for Excel
  const data = items.map((item) => ({
    "Agent Name": item.agentName,
    "Requested Prompt": item.requestedPrompt,
    "Feedback Text": item.feedbackText,
    "Reaction": item.reaction,
    "Agent Message": item.agentMessage,
    "Start Time": item.startTime,
    "Timestamp": item.timestamp,
    "Transcript ID": item.transcriptId,
  }));

  // Create a new workbook and add data
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback");

  // Auto-fit column widths
  const colWidths = [
    { wch: 20 }, // Agent Name
    { wch: 40 }, // Requested Prompt
    { wch: 40 }, // Feedback Text
    { wch: 12 }, // Reaction
    { wch: 40 }, // Agent Message
    { wch: 20 }, // Start Time
    { wch: 20 }, // Timestamp
    { wch: 25 }, // Transcript ID
  ];
  worksheet["!cols"] = colWidths;

  // Generate Excel file
  XLSX.writeFile(workbook, filename);
}

# Copilot Studio Feedback Viewer Application Flow

```mermaid
flowchart TD
    A[Start Application] --> B{Config exists in localStorage / env}
    B -->|No| C[Show ConfigPage]
    C --> D[User enters Dataverse URL, Tenant ID, Client ID]
    D --> E[Validate inputs]
    E -->|Invalid| C
    E -->|Valid| F[Save config to localStorage]
    F --> G[Create MSAL instance]

    B -->|Yes| G
    G --> H[Initialize MSAL]
    H --> I{MSAL initialized?}
    I -->|No| J[Show init loading / error]
    I -->|Yes| K[Render MsalProvider]
    K --> L[AuthenticatedApp]

    L --> M{User authenticated?}
    M -->|No| N[Show LoginPage]
    N --> O[User clicks Sign in]
    O --> P[loginPopup(scopes)]
    P --> Q{Login success?}
    Q -->|Yes| R[Render Dashboard]
    Q -->|No| N
    M -->|Yes| R

    R --> S[Dashboard mounts]
    S --> T[fetchEnvironmentName(instance, config)]
    S --> U[loadFeedback()]

    U --> V[getAccessToken(instance, config)]
    V --> W{account found?}
    W -->|No| X[Error: sign in required]
    W -->|Yes| Y[acquireTokenSilent(scopes)]
    Y -->|Interaction required| Z[acquireTokenPopup(scopes)]
    Z --> AA[Get access token]

    AA --> AB[detectApiVersion via WhoAmI]
    AB --> AC{entitySetName override provided?}
    AC -->|Yes| AD[Use override or best-guess schema]
    AC -->|No| AE[Try EntityDefinitions metadata]
    AE -->|Found| AF[Select discovered schema]
    AE -->|Not found| AG[Probe candidate entity sets]
    AG -->|Success| AF
    AG -->|Fail| AH[Error: cannot locate ConversationTranscript]

    AF --> AI[Fetch transcripts pages from Dataverse]
    AI --> AJ[extractFeedback(items)]
    AJ --> AK[Update feedbackItems state]

    AK --> AL[Render stats and FeedbackTable(filtered)]
    AL --> AM{User action}
    AM -->|Filter/Search| AL
    AM -->|Refresh| U
    AM -->|Export| AN[exportFeedbackToExcel(filtered)]
    AM -->|Sign out| AO[clearConfig(); reset state]
    AO --> C
```
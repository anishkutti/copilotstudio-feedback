Setup/Config Flow Chart

subgraph Azure
    direction TD
    A1[Register app in Azure]
    A2[Create client secret]
    A3[Add Dynamics CRM permissions and grant access steps]
    A4[Configure Authentication and Single Page Application redirect URI]
    A5[Grant admin consent]
    A1 --> A2 --> A3 --> A4 --> A5
end

subgraph PowerPlatform
    direction TD
    P1[Open Power Platform Admin Center and select environment]
    P2[Go to Application Users]
    P3[Add application user and assign Service Reader role]
    P1 --> P2 --> P3
end

subgraph DataverseAPI
    direction TD
    D1[Copy Dataverse environment base URL]
    D2[Build Web API endpoint]
    D3[Test authentication and API access]
    D4{Access works?}
    D5[Use app to read Dataverse tables]
    D6[Check permissions, admin consent, secret, and application user role]
    D7[Retry connection]
    D1 --> D2 --> D3 --> D4
    D4 -->|Yes| D5
    D4 -->|No| D6 --> D7 --> D4
end

A5 --> P1
P3 --> D1

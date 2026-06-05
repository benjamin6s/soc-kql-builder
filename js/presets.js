// Demo-only SOC presets. Values are fake and stay entirely local in the browser.
const SOC_PRESETS = [
  {
    name: "Suspicious PowerShell",
    category: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    timeRange: "24h",
    filters: [
      { column: "FileName", operator: "==", value: "powershell.exe" },
      { column: "ProcessCommandLine", operator: "contains", value: "-NoProfile" }
    ],
    outputColumns: ["Timestamp", "DeviceName", "FileName", "ProcessCommandLine", "InitiatingProcessFileName"],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Encoded PowerShell Command",
    category: "Microsoft Defender for Endpoint",
    table: "DeviceProcessEvents",
    timeRange: "24h",
    filters: [
      { column: "FileName", operator: "==", value: "powershell.exe" },
      { column: "ProcessCommandLine", operator: "contains", value: "-EncodedCommand" }
    ],
    outputColumns: ["Timestamp", "DeviceName", "AccountName", "FileName", "ProcessCommandLine"],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Failed Sign-ins",
    category: "Microsoft Entra ID",
    table: "SigninLogs",
    timeRange: "24h",
    filters: [
      { column: "ResultType", operator: "!=", value: "0" },
      { column: "UserPrincipalName", operator: "contains", value: "demo.user" }
    ],
    outputColumns: ["TimeGenerated", "UserPrincipalName", "AppDisplayName", "ResultType", "IPAddress"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Failed Entra Sign-ins",
    category: "Microsoft Entra ID",
    table: "EntraIdSignInEvents",
    timeRange: "24h",
    filters: [
      { column: "ErrorCode", operator: "!=", value: "0" },
      { column: "FailureReason", operator: "contains", value: "demo failure" }
    ],
    outputColumns: ["Timestamp", "AccountUpn", "Application", "IPAddress", "ErrorCode", "FailureReason", "ConditionalAccessStatus"],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Risky Users Review",
    category: "Microsoft Entra ID",
    table: "AADRiskyUsers",
    timeRange: "7d",
    filters: [
      { column: "RiskLevel", operator: "!=", value: "none" },
      { column: "RiskState", operator: "contains", value: "demo" }
    ],
    outputColumns: ["TimeGenerated", "UserPrincipalName", "UserDisplayName", "RiskLevel", "RiskState", "RiskDetail"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Service Principal Sign-in Failures",
    category: "Microsoft Entra ID",
    table: "AADServicePrincipalSignInLogs",
    timeRange: "24h",
    filters: [
      { column: "ResultType", operator: "!=", value: "0" },
      { column: "ServicePrincipalName", operator: "contains", value: "demo-app" }
    ],
    outputColumns: ["TimeGenerated", "ServicePrincipalName", "AppId", "ResourceDisplayName", "ResultType", "ResultDescription"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Endpoint Network Connections",
    category: "Microsoft Defender for Endpoint",
    table: "DeviceNetworkEvents",
    timeRange: "6h",
    filters: [
      { column: "DeviceName", operator: "contains", value: "demo-endpoint" },
      { column: "RemotePort", operator: "==", value: "443" }
    ],
    outputColumns: ["Timestamp", "DeviceName", "InitiatingProcessFileName", "RemoteUrl", "RemoteIP", "RemotePort"],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Registry Persistence Check",
    category: "Microsoft Defender for Endpoint",
    table: "DeviceRegistryEvents",
    timeRange: "7d",
    filters: [
      { column: "RegistryKey", operator: "contains", value: "Run" },
      { column: "ActionType", operator: "contains", value: "RegistryValue" }
    ],
    outputColumns: [
      "Timestamp",
      "DeviceName",
      "ActionType",
      "RegistryKey",
      "RegistryValueName",
      "RegistryValueData",
      "InitiatingProcessFileName"
    ],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Local Admin Logons",
    category: "Microsoft Defender for Endpoint",
    table: "DeviceLogonEvents",
    timeRange: "24h",
    filters: [
      { column: "IsLocalAdmin", operator: "==", value: "true" },
      { column: "ActionType", operator: "contains", value: "Logon" }
    ],
    outputColumns: ["Timestamp", "DeviceName", "AccountDomain", "AccountName", "LogonType", "RemoteIP", "IsLocalAdmin"],
    sortColumn: "Timestamp",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Windows Failed Logons",
    category: "Microsoft Sentinel / Log Analytics",
    table: "SecurityEvent",
    timeRange: "24h",
    filters: [
      { column: "EventID", operator: "==", value: "4625" },
      { column: "Account", operator: "contains", value: "demo-user" }
    ],
    outputColumns: ["TimeGenerated", "Computer", "EventID", "Activity", "Account", "LogonType", "IpAddress"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "High Severity Sentinel Incidents",
    category: "Microsoft Sentinel / Log Analytics",
    table: "SecurityIncident",
    timeRange: "7d",
    filters: [
      { column: "Severity", operator: "==", value: "High" },
      { column: "Status", operator: "!=", value: "Closed" }
    ],
    outputColumns: ["TimeGenerated", "IncidentNumber", "Title", "Severity", "Status", "Owner"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 50
  },
  {
    name: "Firewall Denied Traffic",
    category: "Microsoft Sentinel / Log Analytics",
    table: "CommonSecurityLog",
    timeRange: "6h",
    filters: [
      { column: "DeviceAction", operator: "contains", value: "deny" },
      { column: "DestinationPort", operator: "in", value: "22, 3389" }
    ],
    outputColumns: ["TimeGenerated", "DeviceVendor", "DeviceProduct", "SourceIP", "DestinationIP", "DestinationPort", "DeviceAction"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Missing Heartbeat / Log Source Check",
    category: "Microsoft Sentinel / Log Analytics",
    table: "Heartbeat",
    timeRange: "24h",
    filters: [
      { column: "OSType", operator: "==", value: "Windows" },
      { column: "Category", operator: "contains", value: "Direct Agent" }
    ],
    outputColumns: ["TimeGenerated", "Computer", "OSType", "ResourceGroup", "ResourceType", "Category"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 100
  },
  {
    name: "Recent Security Alerts",
    category: "Microsoft Sentinel / Log Analytics",
    table: "SecurityAlert",
    timeRange: "7d",
    filters: [
      { column: "AlertSeverity", operator: "!=", value: "Informational" },
      { column: "AlertName", operator: "contains", value: "demo alert" }
    ],
    outputColumns: ["TimeGenerated", "AlertName", "AlertSeverity", "ProviderName", "Tactics", "CompromisedEntity"],
    sortColumn: "TimeGenerated",
    sortDirection: "desc",
    limit: 50
  }
];

# SOC KQL Builder

## Live Demo

[Open SOC KQL Builder](https://benjamin6s.github.io/soc-kql-builder/)

SOC KQL Builder is a local, offline web app for building basic KQL queries for SOC and blue-team learning workflows.

It is designed as a junior SOC analyst portfolio project and learning tool. The app helps users practice common KQL structure without needing to memorize every table name, column name, or operator.

This is an independent learning project. It is not an official Microsoft tool.

## Project Overview

The app turns form selections into plain KQL text. Users can choose a table, add filters, select output columns, sort results, set a row limit, and copy the generated query.

The goal is to make basic KQL query construction easier to understand for learners while keeping the app simple, transparent, and fully offline.

## Problem This Tool Solves

KQL is powerful, but beginners often get slowed down by query mechanics:

- Choosing the right table
- Remembering useful columns
- Picking operators that match column types
- Adding consistent time filters
- Building multiple `where` clauses
- Projecting useful output fields
- Sorting and limiting results

SOC KQL Builder provides guided query construction for those basics.

## Current Features

- Static offline web app
- Category and table selection
- Table and column search from local metadata
- Local schema metadata
- Time range filtering
- Multiple filter rows
- Expanded type-aware KQL operators for string, numeric, datetime, boolean, and dynamic columns
- Lightweight input validation and safety warnings
- Output column selection
- Sort column and direction controls
- Result limit control
- Live generated KQL output
- Lightweight KQL syntax highlighting
- Copy-to-clipboard button
- Keyboard shortcuts for copy, save, and new query actions
- Demo SOC query presets
- Query explanation panel
- Local template save/load/delete using browser `localStorage`
- Template export/import as JSON with validation

## How To Run Locally

No install step is required.

1. Clone or download this repository.
2. Open `index.html` in a web browser.
3. Select a preset or build a query manually.
4. Copy the generated KQL text.

The app uses only local HTML, CSS, JavaScript, and static metadata files.

## Security Model

SOC KQL Builder is intentionally offline and static.

It does not:

- Connect to live Microsoft services
- Run KQL queries
- Use APIs
- Require authentication
- Use credentials
- Collect telemetry or analytics
- Process production data
- Store secrets
- Sync templates to cloud services

All query generation happens in the browser. Saved templates are stored only in the browser's local storage on the user's machine.

## Supported Tables

The current version supports simplified local metadata for learning and query building. These table definitions are intentionally SOC-friendly and do not claim full official Microsoft schema coverage.

Microsoft Defender for Endpoint learning tables:

- `DeviceProcessEvents`
- `DeviceNetworkEvents`
- `DeviceFileEvents`
- `DeviceRegistryEvents`
- `DeviceLogonEvents`
- `DeviceImageLoadEvents`
- `DeviceEvents`
- `DeviceInfo`
- `AlertInfo`
- `AlertEvidence`

Microsoft Defender for Identity learning tables:

- `IdentityLogonEvents`
- `IdentityInfo`
- `IdentityQueryEvents`
- `IdentityDirectoryEvents`

Microsoft Entra ID learning tables:

- `SigninLogs`
- `EntraIdSignInEvents`
- `AADServicePrincipalSignInLogs`
- `AADNonInteractiveUserSignInLogs`
- `AuditLogs`
- `AADProvisioningLogs`
- `AADRiskyUsers`

Microsoft Sentinel / Log Analytics learning tables:

- `SecurityEvent`
- `Syslog`
- `CommonSecurityLog`
- `SecurityAlert`
- `SecurityIncident`
- `Heartbeat`
- `AzureActivity`
- `OfficeActivity`
- `W3CIISLog`
- `Event`

## Example Generated KQL

```kql
DeviceProcessEvents
| where Timestamp > ago(24h)
| where FileName == "powershell.exe"
| where ProcessCommandLine contains "-EncodedCommand"
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine
| sort by Timestamp desc
| take 100
```

## Limitations

- The app generates KQL text but does not run queries.
- The app does not validate queries against live Microsoft schemas.
- The local schemas are simplified for learning and may not match every live environment.
- The app does not know whether a generated query will return useful results.
- Local templates should be reviewed before sharing.

## How To Test Manually

1. Open `index.html` in a browser.
2. Select each preset and confirm the generated KQL changes.
3. Add multiple filters and confirm each non-empty valid filter creates a `where` line.
4. Change filter columns and confirm the operator list changes by column type.
5. Select and clear output columns and confirm the `project` line updates.
6. Change sort direction and limit and confirm the output updates.
7. Try invalid numeric, boolean, datetime, and limit values and confirm warnings appear.
8. Save a local template, load it, delete it, export templates as JSON, and import them back.
9. Confirm no network connection or login is required.

## Future Improvements

- More supported tables
- More demo SOC presets
- More detailed query explanations
- Better validation messages for KQL syntax
- Improved keyboard accessibility
- More responsive layout polish

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Local static metadata
- Browser `localStorage`

## Credits / Inspiration

This project was inspired by Chris Huber.

He built an open-source desktop KQL query builder "KustoForge" for Microsoft security and Azure services.

SOC KQL Builder is a separate web-based implementation built as a learning and portfolio project.

No source code from KustoForge was copied into this project. The goal was to build my own offline static web version focused on junior SOC learning workflows.

## Problem

KQL is powerful, but junior analysts often struggle with:
- remembering table names
- remembering column names
- choosing the correct operators
- building consistent query structure
- adding time filters
- projecting relevant columns

## Goal

Build an offline query builder that helps generate simple KQL queries for SOC workflows.

## Non-goals

This tool will not:
- connect to live environments
- run queries
- authenticate users
- collect logs
- store sensitive data

## Initial tables

First version will focus on:

- DeviceProcessEvents
- DeviceNetworkEvents
- DeviceFileEvents
- SigninLogs
- SecurityAlert

## Example use cases

- Suspicious PowerShell execution
- Encoded command detection
- Failed sign-in review
- Network connections from an endpoint
- Recent Defender alerts
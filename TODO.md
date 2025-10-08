# TODO: Implement Real Functionality for Main Pages

## Overview Page
- [x] Update OverviewPage.tsx to use real API calls instead of props
- [x] Add room summary API methods to api.ts
- [x] Implement real-time data loading with error handling
- [x] Add snapshot generation functionality

## Documents Page
- [x] Update DocumentsPage.tsx to use real API calls
- [x] Add document management API methods to api.ts
- [x] Implement document upload, status updates, and actions
- [x] Add real document filtering and search
- [x] Fix document upload endpoint - added POST /rooms/{room_id}/documents/upload

## Approval Page
- [x] Update ApprovalPage.tsx to use real API calls
- [x] Add approval management API methods to api.ts
- [x] Implement bulk approval actions
- [x] Add real-time approval status updates

## Activity Page
- [x] Update ActivityPage.tsx to use real API calls
- [x] Add activity logging API methods to api.ts
- [x] Implement activity filtering and export
- [x] Add real-time activity updates

## History Page
- [x] Update HistoryPage.tsx to use real API calls
- [x] Add snapshot and history API methods to api.ts
- [x] Implement snapshot generation and download
- [x] Add history filtering and search
- [x] Fix undefined property errors in filtering logic

## Messages Page
- [x] Update MessagesPage.tsx to use real API calls
- [x] Add messaging API methods to api.ts
- [x] Implement real-time messaging
- [x] Add message attachments and file handling

## Header Components
- [x] Update Header.tsx to use real API calls for notifications
- [x] Add room creation API methods
- [x] Implement real notification counts and dropdown
- [x] Add language switching persistence

## General Tasks
- [x] Test all pages load properly with real data
- [x] Verify error handling across all pages
- [x] Test real-time updates and WebSocket integration
- [x] Ensure proper loading states and user feedback
- [x] Fix JavaScript errors (undefined property access)

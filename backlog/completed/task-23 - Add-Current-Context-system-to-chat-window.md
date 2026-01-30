---
id: task-23
title: Add "Current Context" system to chat window
status: Done
assignee: []
created_date: '2026-01-30 20:19'
updated_date: '2026-01-30 20:27'
labels:
  - chat
  - context
  - ux
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish a "Current Context" system where the currently active side-list tab automatically becomes a context chip in the chat window.

**Behavior:**
- The active tab is automatically represented as a context chip (looks identical to user-added context chips)
- If the user switches to a different tab, the active-tab chip **swaps** to the new tab (not additive — only one active-tab chip at a time)
- The user can remove the active-tab chip, but if they switch tabs again, the new tab's chip appears
- The active-tab chip is visually indistinguishable from other context chips to the user, but internally tracked as the "active tab" chip so it can be swapped on tab change
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active tab automatically appears as a context chip in chat input area
- [x] #2 Switching tabs swaps the active-tab chip (replaces, not adds)
- [x] #3 User can manually remove the active-tab chip
- [x] #4 If removed and user switches tabs, the new active tab chip reappears
- [x] #5 Active-tab chip is visually identical to user-added context chips
- [x] #6 Active-tab chip is internally distinguishable so it can be swapped on tab change
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## File Activity

### Modified
- `src/state/tab-state.js` — Added `selectionListeners` array, `onSelectionChange(fn)` export, notification in `setSelection()`
- `src/features/agent-panel.js` — Added import of `onSelectionChange`/`getSelection`, `SELECTION_TYPE_MAP`, `handleSelectionChange()`, dismissal tracking in `removeContextItem`/`toggleContextItem`, subscription + seed in `init()`
<!-- SECTION:NOTES:END -->

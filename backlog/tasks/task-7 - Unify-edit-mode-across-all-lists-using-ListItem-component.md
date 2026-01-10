---
id: task-7
title: Unify edit mode across all lists using ListItem component
status: Done
assignee: []
created_date: '2026-01-09 22:07'
updated_date: '2026-01-09 23:02'
labels:
  - ui
  - refactor
  - edit-mode
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, Objectives uses a separate prompt row for editing while Priorities and Steps use inline contenteditable. This creates an inconsistent UX.

## Current State

- **Priorities**: Uses ListItem with inline contenteditable (clean, consistent)
- **Objectives**: Uses separate `prompt-row` element for editing (breaks visual flow)
- **Steps**: Uses ListItem with contenteditable but timestamp icon handling is awkward

## Goals

1. **Objectives Edit Mode**: Switch from prompt-row to inline contenteditable like Priorities
   - Keep the numbered icon (`1.`, `2.`, etc.)
   - Change icon to `>` when editing
   - Make content directly editable inline

2. **Steps Edit Mode**: Clean up the editing experience
   - Keep timestamp in icon column
   - Add proper `>` indicator when editing (separate from timestamp)
   - Consider splitting icon into timestamp + edit indicator

3. **Refine Mode**: Apply same inline approach for refining descriptions
   - Currently uses prompt-row, should use inline editing

## Benefits

- Consistent edit experience across all list types
- No layout shift when entering/exiting edit mode
- Cleaner visual design
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Objectives list uses inline contenteditable for edit mode
- [x] #2 Objectives list uses inline contenteditable for refine mode
- [x] #3 Steps list has clean edit indicator separate from timestamp
- [x] #4 No prompt-row usage for inline editing (only for 'add new' flows)
- [x] #5 Consistent icon change (to >) across all list types when editing
- [x] #6 Zero layout shift when entering/exiting edit mode
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation (2026-01-09)

### Changes Made:
1. **Objectives Edit Mode** - Updated `renderSideList()` to use inline contenteditable with `>` icon. Added hidden icon placeholder to prevent layout shift.
2. **Objectives Refine Mode** - Updated `renderContentView()` with inline contenteditable in header description.
3. **Steps Edit Mode** - Refactored to separate DOM elements with dedicated edit indicator span.
4. **New Functions**: `startEditObjective()`, `startRefineObjective()`, `startDeleteObjective()`
5. **Keyboard Shortcuts**: `e` edit, `r` refine, `d` delete for objectives
6. **Layout Stability**: Invisible placeholders prevent shift when entering/exiting edit mode
7. **CSS Updates**: `.side-item.editing`, `.side-item-icon` classes added
<!-- SECTION:NOTES:END -->

---
id: task-1
title: Implement blessed TUI framework for the app
status: Done
assignee:
  - Claude
created_date: '2026-01-08 04:36'
updated_date: '2026-01-08 04:41'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the existing app to use [blessed](https://github.com/chjj/blessed) as the terminal user interface (TUI) framework. Blessed is a curses-like library with a high-level terminal interface API for node.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 App uses blessed for terminal UI rendering
- [x] #2 Existing functionality is preserved with the new TUI
- [x] #3 Terminal interface is responsive and handles window resizing
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Architecture Changes
- **life.js**: Refactor from async loops to blessed screen lifecycle
- **lib/ui.js**: Complete rewrite with blessed widgets
- **lib/data.js**: No changes needed

### Blessed Components
1. **Screen**: Main blessed screen with smartCSR
2. **Header Box**: Current item context display
3. **List Widget**: Navigable item list with progress
4. **Status Bar**: Keyboard shortcuts display
5. **Prompt Dialog**: Add/edit operations
6. **Question Dialog**: Delete confirmation

### Keyboard Navigation
- ↑/↓ or j/k: Navigate list
- Enter: Select/drill down
- a: Add new item
- e: Edit selected item
- d: Delete (with confirmation)
- Backspace/b: Go back
- q/Ctrl+C: Quit

### Files to Modify
1. package.json - Add blessed, keep chalk
2. lib/ui.js - Complete rewrite
3. life.js - Refactor to blessed lifecycle
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Complete

- Replaced inquirer with blessed widgets (list, prompt, question, message)
- Replaced chalk with blessed's built-in tag syntax for colors
- Implemented event-driven architecture with callbacks
- Added keyboard shortcuts: ↑↓/jk navigate, Enter select, a add, e edit, d delete, Space toggle, b/Backspace back, q quit
- Added resize handling via screen 'resize' event
- Preserved all original functionality: hierarchical navigation, 3-item limits, progress percentages, due dates, task completion
<!-- SECTION:NOTES:END -->

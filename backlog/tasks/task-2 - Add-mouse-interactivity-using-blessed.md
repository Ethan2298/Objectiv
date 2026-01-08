---
id: task-2
title: Add mouse interactivity using blessed
status: Done
assignee: []
created_date: '2026-01-08 04:45'
updated_date: '2026-01-08 04:52'
labels:
  - enhancement
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable mouse support in the blessed terminal UI to allow clicking, scrolling, and other mouse interactions, making the app behave more like a standard GUI application.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mouse clicks can select/interact with UI elements
- [x] #2 Scroll wheel works for navigating lists or content
- [x] #3 Mouse hover effects work where appropriate
- [x] #4 All existing keyboard controls continue to work
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

1. **Enable mouse on screen** (`lib/ui.js:50-54`)
   - Add `mouse: true` to screen options for global mouse event capture

2. **Add click handlers for header navigation**
   - Clicking the header triggers "back" navigation

3. **Verify scroll wheel support**
   - With `mouse: true` on screen + list, scrolling should work automatically

4. **Add hover effects for list items**
   - Track mouseover/mouseout events on list
   - Apply subtle visual feedback on hover

5. **Ensure keyboard controls remain functional**
   - All existing key bindings stay unchanged

### Files to Modify
- `lib/ui.js`
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Complete

Changes made to `lib/ui.js`:

1. **Screen mouse support** (line 54): Added `mouse: true` to screen options
2. **Header clickable** (lines 65-71): Added `clickable: true` and hover style to header box
3. **Header click handler** (lines 237-241): Clicking header triggers back navigation
4. **Hover effects** (lines 244-261): List items highlight on mouse hover
5. **Status bar updated** (lines 362-368): Shows mouse controls alongside keyboard shortcuts

All keyboard controls remain intact - mouse support is additive.

## Warp Terminal Compatibility Issue

Discovered that Warp terminal has a known bug where mouse clicks don't register in blessed.js applications (GitHub issue warpdotdev/Warp#4736). Mouse movement works but clicks don't.

**Workarounds:**
- Enable Mouse Reporting in Warp settings
- Use alternative terminal (iTerm2, Terminal.app, Kitty, Alacritty)

The implementation is correct and works in other terminals.
<!-- SECTION:NOTES:END -->

---
id: task-4
title: 'Steps: Newest-first ordering with IDs and timestamps'
status: Done
assignee: []
created_date: '2026-01-09 20:12'
updated_date: '2026-01-09 20:19'
labels:
  - ui
  - steps
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enhance how steps are displayed and tracked:

**Ordering:** Steps appear newest-first (most recent at top)

**Unique Identifiers:** Each step gets an order number (#1, #2, #3...) assigned when created. This is the creation order, not display order - so #5 would appear above #4 in the list.

**Timestamps:** 
- Store full date+time with year in data (e.g., "2026-01-09T14:34:00")
- Display: omit year if current year ("Jan 9 2:34pm"), show year otherwise ("Jan 9 2025 2:34pm")
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Steps display newest-first (reverse chronological)
- [x] #2 Each step has unique ID (#1, #2, etc.) based on creation order
- [x] #3 Full date+time with year stored in data
- [x] #4 Display omits year if current year, shows year otherwise

- [x] #5 Timestamp appears in minimal style next to step title
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

**Changes made to `index.html`:**

1. **`formatTimestamp()` (lines 470-496)** - Enhanced to show time and conditional year:
   - Format: "Jan 9 2:34pm" (current year) or "Jan 9 2025 2:34pm" (other years)
   - 12-hour time with am/pm, minutes omitted when :00

2. **`processLogStepInput()` (lines 1125-1147)** - Added orderNumber to new steps:
   - Calculates `maxOrder + 1` from existing steps
   - Stores as `orderNumber` field in step object

3. **Step rendering loop (lines 811-844)** - Reversed display order:
   - Changed from `forEach` to `for` loop iterating backwards
   - Maps displayIdx to actualIdx for correct edit/delete targeting
   - Shows order number: `#${orderNum} ${timestamp}`
   - Fallback for legacy steps without orderNumber

4. **`getSelectionInfo()` (lines 599-626)** - Fixed index mapping:
   - Converts display index (0=newest at top) to array index (0=oldest)
   - Formula: `actualIndex = stepsCount - 1 - displayIndex`
<!-- SECTION:NOTES:END -->

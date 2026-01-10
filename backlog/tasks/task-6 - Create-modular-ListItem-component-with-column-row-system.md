---
id: task-6
title: Create modular ListItem component with column/row system
status: Done
assignee: []
created_date: '2026-01-09 22:00'
updated_date: '2026-01-09 22:05'
labels:
  - ui
  - refactor
  - component
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the Priorities list component into a reusable, modular "ListItem" component with a flexible column/row architecture. This component should be reusable across Priorities, Objectives, and Steps lists.

## Row System Concept

Each list item is composed of multiple "rows" (conceptually columns within the item):

1. **Icon Row** - The leading icon (currently dash for priorities). The icon can change based on context/state.

2. **Title Row** - The main text/title content with:
   - Text wrapping features (Notion-like behavior)
   - Proper overflow handling

3. **Badge Row** - For elements like the Clarity Badge. This is its own discrete section.

## Goals

- Create a single modular component that defines this row structure
- Make it flexible enough to be reused for:
  - Priorities list
  - Objectives list  
  - Steps list
- Each list type can customize which rows to show and what content goes in them
- Maintain consistent layout/spacing across all list types
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ListItem component created with configurable row slots
- [x] #2 Icon Row supports customizable icons
- [x] #3 Title Row has Notion-like text wrapping behavior
- [x] #4 Badge Row is optional and discrete
- [x] #5 Priorities list refactored to use new ListItem component
- [x] #6 Objectives list refactored to use new ListItem component
- [x] #7 Steps list refactored to use new ListItem component
- [x] #8 Consistent spacing and alignment across all list types
<!-- AC:END -->

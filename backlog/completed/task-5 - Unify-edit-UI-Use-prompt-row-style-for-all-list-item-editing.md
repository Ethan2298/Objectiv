---
id: task-5
title: 'Unify edit UI: Use prompt-row style for all list item editing'
status: Done
assignee: []
created_date: '2026-01-09 21:31'
updated_date: '2026-01-09 21:35'
labels:
  - ui
  - consistency
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the prompt-row edit style (bordered input box with label, like objectives use) the standard for editing all list items app-wide. Currently priorities and steps use inline editing which is inconsistent. All editable items (objectives, priorities, steps) should use the same prompt-row component for a unified experience.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Complete

Unified all list item editing to use the prompt-row style:

1. **Priorities edit mode** (index.html:937-944): Now uses `createPromptRow('Name:', priority.name)`
2. **Priorities refine mode** (index.html:946-953): Now uses `createPromptRow('Refine description:', priority.description || '')`
3. **Steps edit mode** (index.html:1019-1026): Now uses `createPromptRow('Step:', step.name)`

Also removed the now-unused `.inline-edit` CSS class (was at lines 238-248).

All editable items now use the same bordered cyan box with label and ">" prefix, matching the objectives edit style.
<!-- SECTION:NOTES:END -->

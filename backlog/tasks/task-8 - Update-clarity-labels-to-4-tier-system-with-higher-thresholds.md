---
id: task-8
title: Update clarity labels to 4-tier system with higher thresholds
status: Done
assignee: []
created_date: '2026-01-09 22:20'
updated_date: '2026-01-09 22:20'
labels:
  - ui
  - enhancement
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Change clarity scoring labels from the current 3-tier system (fuzzy/forming/clear) to a 4-tier system with higher bars:

- 0-40% → fuzzy
- 41-60% → less fuzzy
- 61-80% → clear
- 81-100% → very clear

Update the `calculateClarity()` function in index.html to use these new thresholds and labels.
<!-- SECTION:DESCRIPTION:END -->

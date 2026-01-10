---
id: task-3
title: 'Overhaul UI: Objectives, Priorities, Steps'
status: Done
assignee: []
created_date: '2026-01-09 19:48'
updated_date: '2026-01-09 19:57'
labels:
  - ui
  - philosophy
  - core-concept
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reframe the entire UI philosophy. This is NOT a planning tool - it's about defining clarity over time.

**Three-Level Hierarchy:**
- **Objectives** - What you're trying to achieve, refined clearer over time
- **Priorities** - What matters most, refined clearer over time  
- **Steps** - What you actually did (logged after the fact, not planned ahead)

The key insight: clarity emerges through action, not upfront planning. You start with fuzzy objectives and priorities, and they sharpen as you take steps and learn.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Three-level hierarchy: Objectives → Priorities → Steps
- [x] #2 Steps are logged (past tense), not planned (future tense)
- [x] #3 Objectives and Priorities have 'clarity' indicator instead of 'progress'
- [x] #4 Remove due dates - this isn't about deadlines
- [x] #5 Steps show timestamp of when logged, not checkboxes
- [x] #6 Header shows current clarity level of parent
- [x] #7 Remove the 'max 3' constraint on Steps (log as many as you do)
- [x] #8 Add 'refine' action for Objectives/Priorities to update their description
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## UI Philosophy Changes

### New Hierarchy
```
Objectives        (what you're trying to achieve)
  └─ Priorities   (what matters most right now)
       └─ Steps   (what you actually did - logged)
```

### Key Mental Shifts

**1. Steps are PAST, not FUTURE**
- Current: "[ ] Call dentist" (todo)
- New: "Called dentist about appointment" (logged)
- No checkboxes - steps are facts, not tasks
- Show timestamp: "Jan 9 - Called dentist"

**2. Clarity replaces Progress**
- Current: "[45%]" progress bar
- New: Show description richness as clarity signal
- Maybe: "fuzzy → forming → clear" or just show description length
- Encourages refining the description over time

**3. No Due Dates**
- Deadlines create anxiety, not clarity
- If something matters, you'll take steps
- Steps have timestamps (when you did it), not due dates

**4. Refine Action**
- New [r] keybind to "refine" an Objective or Priority
- Opens inline edit for just the description
- Encourages iterative sharpening of "what this really means"

**5. Unlimited Steps**
- Remove "max 3" on steps
- You log what you actually did
- Scroll through history of action

### New Status Bar
```
[↑↓] Navigate  [Enter] Drill in  [s] Log step  [r] Refine  [Esc] Back
```

### Visual Changes
- Replace progress % with clarity indicator
- Steps show "Jan 9 - Did the thing" format
- Remove checkbox styling from steps
- Add "what did you do?" prompt for logging steps
- Top level header: "OBJECTIVES"
<!-- SECTION:PLAN:END -->

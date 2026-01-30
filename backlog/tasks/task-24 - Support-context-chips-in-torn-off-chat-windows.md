---
id: task-24
title: Support context chips in torn-off chat windows
status: In Progress
assignee: []
created_date: '2026-01-30 20:30'
updated_date: '2026-01-30 20:37'
labels:
  - feature
  - agent-panel
  - chat-window
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The context chip system (active-tab auto-sync + @ context button) currently only works in the main agent panel. When a chat tab is torn off into a standalone window, all context chip state is lost and the features are unavailable.

## Current Behavior

When tearing off a tab, `tearOffTab()` in `agent-panel.js:865` only serializes `messages`, `mode`, and `title`. The `selectedContext` array is dropped. The standalone `chat-window.js` has no context chip rendering, no @ search menu, and no active-tab sync.

## Goal

Make context chips a first-class feature in torn-off chat windows so users don't lose context when popping out a tab.

## Key Areas

### 1. Transfer existing chips on tear-off
- Add `selectedContext` to the transfer payload in `agent-panel.js:865`
- Deserialize and render chips on init in `chat-window.js:101-124`

### 2. Render context chips in standalone window
- Port `renderContextChips()` logic (agent-panel.js:1970-2005) to chat-window.js
- Add the `#agent-context-chips` container to `chat-window.html`
- Include chip removal and the serialization-for-prompt flow

### 3. @ context search button
- Port the search menu (agent-panel.js:1665-1749) to chat-window.js
- Data source: use Supabase directly (Repository already works standalone) rather than SideListState which is parent-window-only

### 4. Active-tab sync (cross-window)
- Use BroadcastChannel API to sync selection changes from the main window to torn-off windows
- Main window publishes selection changes on a shared channel
- Torn-off windows subscribe and update the active-tab chip accordingly
- Graceful degradation: if BroadcastChannel unavailable, chips still work statically

### 5. Serialize context into prompts
- Port `serializeContextForPrompt()` (agent-panel.js:2010-2043) so LLM messages include attached context

## Key Files
- `src/features/agent-panel.js` — source of truth for context chip logic
- `src/features/chat-window.js` — standalone window runtime
- `chat-window.html` — standalone window markup
- `src/state/tab-state.js` — selection change subscriptions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existing context chips transfer when a tab is torn off into a standalone window
- [ ] #2 Context chips render and can be removed in the torn-off window
- [ ] #3 @ context search button works in torn-off windows (searches objectives, notes, folders)
- [ ] #4 Active-tab chip syncs across windows via BroadcastChannel
- [ ] #5 Context is serialized into LLM prompts in the torn-off window
- [ ] #6 Tearing off a tab with no context chips still works as before (no regressions)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

### Approach
Ported all context chip logic from agent-panel.js to chat-window.js as standalone functions. The standalone window uses Repository + folder-storage + note-storage directly (no SideListState dependency). BroadcastChannel API syncs active-tab selection from main window to torn-off windows.

### Key Decisions
- `getSearchableItems()` is async in chat-window.js (loads folders/notes from Supabase directly) vs sync in agent-panel.js (uses SideListState cache)
- BroadcastChannel active-tab sync only resolves Objectives synchronously from Repository cache; folder/note active-tab sync would require async lookup, so those work statically via transfer + @ search only
- Repository.initializeData() is called during standalone window init to populate the cache for @ search

## File Activity

### Modified
- `src/features/agent-panel.js` — Added `selectedContext` to tearOffTab transfer payload; added BroadcastChannel publish in handleSelectionChange
- `src/features/chat-window.js` — Added imports (Repository, folder-storage, note-storage); added context chip rendering, removal, toggle, serialization; added @ search menu; added BroadcastChannel subscription; wired context into sendMessage; init calls for context search, broadcast channel, repository
- `chat-window.html` — Added #agent-context-chips container, #agent-context-btn button, .agent-input-footer-left wrapper (matching main panel markup)
<!-- SECTION:NOTES:END -->

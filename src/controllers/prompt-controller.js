/**
 * Prompt Controller Module
 *
 * Handles add/edit/refine workflow for objectives, priorities, and steps.
 */

import AppState from '../state/app-state.js';
import { generateId } from '../utils.js';
import { placeCaretAtEnd, autoResizeTextarea } from '../utils/dom-helpers.js';

// ========================================
// Callbacks (set by app.js)
// ========================================

let _saveData = () => {};
let _updateView = () => {};
let _renderSideList = () => {};
let _renderContentView = () => {};
let _updateStatusBar = () => {};
let _showMessage = () => {};

export function setCallbacks({ saveData, updateView, renderSideList, renderContentView, updateStatusBar, showMessage }) {
  if (saveData) _saveData = saveData;
  if (updateView) _updateView = updateView;
  if (renderSideList) _renderSideList = renderSideList;
  if (renderContentView) _renderContentView = renderContentView;
  if (updateStatusBar) _updateStatusBar = updateStatusBar;
  if (showMessage) _showMessage = showMessage;
}

// ========================================
// Start Add Operations
// ========================================

/**
 * Start adding a new objective
 */
export async function startAddObjective() {
  const data = AppState.getData();
  const Repository = window.Objectiv?.Repository;
  const SideListState = window.Objectiv?.SideListState;

  // Calculate orderIndex to place at top (min - 1)
  const minOrder = data.objectives.reduce((min, o) => Math.min(min, o.orderIndex || 0), 0);
  const topOrderIndex = minOrder - 1;

  // Create objective with placeholder name
  const newObj = {
    id: generateId(),
    name: 'New Objective',
    description: '',
    priorities: [],
    steps: [],
    orderIndex: topOrderIndex
  };

  // Add to beginning of array
  data.objectives.unshift(newObj);

  // Save to storage
  if (Repository?.saveObjective) {
    try {
      await Repository.saveObjective(newObj);
    } catch (err) {
      console.error('Failed to save objective:', err);
    }
  }

  // Select the new objective
  AppState.setSelectedObjectiveIndex(0);
  AppState.setViewMode('objective');

  // Rebuild and render
  if (SideListState) {
    _renderSideList();
    SideListState.selectItem(SideListState.ItemType.OBJECTIVE, newObj.id);
  }

  _updateView();
}

/**
 * Start adding a new priority
 */
export function startAddPriority() {
  // Commit any current edit first
  commitEditInPlace();

  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj || obj.priorities.length >= 3) return;

  // Create placeholder priority
  const newPriority = {
    id: generateId(),
    name: '',
    description: ''
  };
  obj.priorities.push(newPriority);

  // Set up edit mode for the new priority
  AppState.setPromptState({
    mode: 'add',
    step: 0,
    targetIndex: obj.priorities.length - 1,
    targetSection: 'priorities',
    data: { type: 'priority', item: newPriority }
  });

  _renderContentView();
  focusPromptInput();
  _updateStatusBar();
}

/**
 * Start logging a new step
 */
export function startLogStep() {
  // Commit any current edit first
  commitEditInPlace();

  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  // Calculate next order number
  const maxOrder = obj.steps.reduce((max, s) => Math.max(max, s.orderNumber || 0), 0);

  // Create placeholder step
  const newStep = {
    id: generateId(),
    name: '',
    loggedAt: new Date().toISOString(),
    orderNumber: maxOrder + 1
  };
  obj.steps.push(newStep);

  // Set up edit mode for the new step
  AppState.setPromptState({
    mode: 'add',
    step: 0,
    targetIndex: obj.steps.length - 1,
    targetSection: 'steps',
    data: { type: 'step', item: newStep }
  });

  _renderContentView();
  focusPromptInput();
  _updateStatusBar();
}

// ========================================
// Start Edit Operations
// ========================================

/**
 * Start editing a list item in-place (no re-render)
 */
export function startEditInPlace(section, index, listItemEl) {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  let item;
  if (section === 'priorities') {
    item = obj.priorities[index];
  } else if (section === 'steps') {
    item = obj.steps[index];
  }
  if (!item) return;

  const contentSpan = listItemEl.querySelector('.list-item-content');
  if (!contentSpan) return;

  // Set up prompt state
  AppState.setPromptState({
    mode: 'edit',
    step: 0,
    targetIndex: index,
    targetSection: section,
    data: { type: section === 'priorities' ? 'priority' : 'step', item }
  });

  // Make element editable with spellcheck
  contentSpan.setAttribute('contenteditable', 'true');
  contentSpan.setAttribute('spellcheck', 'true');

  // Focus and place cursor at end
  placeCaretAtEnd(contentSpan);

  // Blur handler as fallback
  contentSpan.addEventListener('blur', () => {
    if (AppState.shouldSkipBlurHandler()) {
      AppState.setSkipBlurHandler(false);
      return;
    }
    if (AppState.getPromptMode()) {
      processPromptInput(contentSpan.textContent);
    }
  }, { once: true });

  _updateStatusBar();
}

/**
 * Start editing the objective title in the content header
 */
export function startEditObjectiveTitle() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  const titleEl = document.getElementById('content-header-title');
  if (!titleEl) return;

  // Don't start if already editing
  if (AppState.getPromptMode()) return;

  // Set up prompt state
  AppState.setPromptState({
    mode: 'edit',
    step: 0,
    targetIndex: selectedIdx,
    targetSection: 'objectives',
    data: { type: 'objective', item: obj }
  });

  // Make element editable with spellcheck
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.setAttribute('spellcheck', 'true');

  // Focus and place cursor at end
  placeCaretAtEnd(titleEl);

  // Blur handler as fallback
  titleEl.addEventListener('blur', () => {
    if (AppState.shouldSkipBlurHandler()) {
      AppState.setSkipBlurHandler(false);
      return;
    }
    if (AppState.getPromptMode() === 'edit' && AppState.getPromptTargetSection() === 'objectives') {
      commitObjectiveTitleEdit();
    }
  }, { once: true });

  _updateStatusBar();
}

/**
 * Start editing folder title in content header
 */
export function startEditFolderTitle() {
  const SideListState = window.Objectiv?.SideListState;
  const selectedItem = SideListState?.getSelectedItem();
  const folder = selectedItem?.data;

  if (!folder) return;

  const titleEl = document.getElementById('content-header-title');
  if (!titleEl) return;

  // Don't start if already editing
  if (AppState.getPromptMode()) return;

  // Set up prompt state
  AppState.setPromptState({
    mode: 'edit',
    step: 0,
    targetIndex: null,
    targetSection: 'folders',
    data: { type: 'folder', item: folder }
  });

  // Make element editable with spellcheck
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.setAttribute('spellcheck', 'true');

  // Focus and place cursor at end
  placeCaretAtEnd(titleEl);

  // Blur handler as fallback
  titleEl.addEventListener('blur', () => {
    if (AppState.shouldSkipBlurHandler()) {
      AppState.setSkipBlurHandler(false);
      return;
    }
    if (AppState.getPromptMode() === 'edit' && AppState.getPromptTargetSection() === 'folders') {
      commitFolderTitleEdit();
    }
  }, { once: true });

  _updateStatusBar();
}

// ========================================
// Commit Operations
// ========================================

/**
 * Commit current edit in-place without re-rendering
 * @returns {{ needsRerender: boolean, removedElement: boolean }}
 */
export function commitEditInPlace() {
  const promptMode = AppState.getPromptMode();
  if (!promptMode || (promptMode !== 'edit' && promptMode !== 'add' && promptMode !== 'refine')) {
    return { needsRerender: false, removedElement: false };
  }

  const contentEditable = document.querySelector('.list-item-content[contenteditable="true"]');
  if (!contentEditable) {
    AppState.resetPromptState();
    return { needsRerender: false, removedElement: false };
  }

  const value = contentEditable.textContent.trim();
  const listItem = contentEditable.closest('.list-item') || contentEditable.closest('.side-item');
  let needsRerender = false;
  let removedElement = false;

  AppState.setSkipBlurHandler(true);

  const promptData = AppState.getPromptData();
  const promptTargetIndex = AppState.getPromptTargetIndex();
  const promptTargetSection = AppState.getPromptTargetSection();
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();

  if (promptMode === 'add' && promptData.item) {
    if (!value) {
      // Remove empty placeholder - needs re-render
      if (promptTargetSection === 'objectives') {
        data.objectives.splice(promptTargetIndex, 1);
        AppState.setSelectedObjectiveIndex(Math.max(0, data.objectives.length - 1));
      } else if (promptTargetSection === 'priorities') {
        const obj = data.objectives[selectedIdx];
        if (obj) obj.priorities.splice(promptTargetIndex, 1);
      } else if (promptTargetSection === 'steps') {
        const obj = data.objectives[selectedIdx];
        if (obj) obj.steps.splice(promptTargetIndex, 1);
      }
      needsRerender = true;
      removedElement = true;
    } else {
      // Save and restore in place
      promptData.item.name = value;
      _saveData();
      restoreElementInPlace(contentEditable, listItem, value);
    }
  } else if (promptMode === 'edit' && promptData.item) {
    if (value) {
      promptData.item.name = value;
      _saveData();
    }
    restoreElementInPlace(contentEditable, listItem, promptData.item.name);
  } else if (promptMode === 'refine' && promptData.item) {
    promptData.item.description = value;
    _saveData();
    restoreElementInPlace(contentEditable, listItem, promptData.item.name);
  }

  AppState.resetPromptState();
  return { needsRerender, removedElement };
}

/**
 * Commit objective title edit or add
 */
export function commitObjectiveTitleEdit() {
  const promptTargetSection = AppState.getPromptTargetSection();
  const promptMode = AppState.getPromptMode();

  if (promptTargetSection !== 'objectives') return;
  if (promptMode !== 'edit' && promptMode !== 'add') return;

  AppState.setSkipBlurHandler(true);

  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const promptTargetIndex = AppState.getPromptTargetIndex();
  const promptData = AppState.getPromptData();

  if (promptMode === 'edit') {
    const titleEl = document.getElementById('content-header-title');
    if (!titleEl) return;

    const value = titleEl.textContent.trim();
    const obj = data.objectives[selectedIdx];

    if (value && obj) {
      obj.name = value;
      _saveData();
      _renderSideList();
    } else if (obj) {
      titleEl.textContent = obj.name;
    }

    titleEl.removeAttribute('contenteditable');
    titleEl.removeAttribute('spellcheck');
  } else if (promptMode === 'add') {
    const sidebarInput = document.querySelector('.side-item-name[contenteditable="true"]');
    if (!sidebarInput) return;

    const value = sidebarInput.textContent.trim();

    if (value && promptData.item) {
      promptData.item.name = value;
      _saveData();
      _renderSideList();
    } else {
      data.objectives.splice(promptTargetIndex, 1);
      AppState.setSelectedObjectiveIndex(Math.max(0, data.objectives.length - 1));
      _renderSideList();
    }
  }

  AppState.resetPromptState();
  _updateStatusBar();
}

/**
 * Commit folder title edit
 */
export async function commitFolderTitleEdit() {
  const promptTargetSection = AppState.getPromptTargetSection();
  const promptMode = AppState.getPromptMode();

  if (promptTargetSection !== 'folders') return;
  if (promptMode !== 'edit') return;

  AppState.setSkipBlurHandler(true);

  const titleEl = document.getElementById('content-header-title');
  if (!titleEl) return;

  const value = titleEl.textContent.trim();
  const promptData = AppState.getPromptData();
  const folder = promptData?.item;
  const data = AppState.getData();

  if (value && folder) {
    // Update folder name in data.folders
    const folderInData = data.folders.find(f => f.id === folder.id);
    if (folderInData) {
      folderInData.name = value;
    }
    folder.name = value;

    // Save to database
    const Repository = window.Objectiv?.Repository;
    if (Repository?.updateFolder) {
      try {
        await Repository.updateFolder({ id: folder.id, name: value });
      } catch (err) {
        console.error('Failed to update folder:', err);
      }
    }

    _renderSideList();
  } else if (folder) {
    titleEl.textContent = folder.name;
  }

  titleEl.removeAttribute('contenteditable');
  titleEl.removeAttribute('spellcheck');

  AppState.resetPromptState();
  _updateStatusBar();
}

// ========================================
// Process Input
// ========================================

/**
 * Process prompt input
 */
export function processPromptInput(value) {
  const promptMode = AppState.getPromptMode();

  if (promptMode === 'add') {
    processAddStep(value);
  } else if (promptMode === 'edit') {
    processEditStep(value);
  } else if (promptMode === 'refine') {
    processRefineStep(value);
  }
}

function processAddStep(value) {
  const promptData = AppState.getPromptData();
  const promptTargetIndex = AppState.getPromptTargetIndex();
  const promptTargetSection = AppState.getPromptTargetSection();
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();

  // Handle inline add (item already exists as placeholder)
  if (promptData.item) {
    if (!value.trim()) {
      // Remove placeholder and cancel
      if (promptData.type === 'objective') {
        data.objectives.splice(promptTargetIndex, 1);
        AppState.setSelectedObjectiveIndex(Math.max(0, data.objectives.length - 1));
      } else if (promptData.type === 'priority') {
        const obj = data.objectives[selectedIdx];
        if (obj) obj.priorities.splice(promptTargetIndex, 1);
      } else if (promptData.type === 'step') {
        const obj = data.objectives[selectedIdx];
        if (obj) obj.steps.splice(promptTargetIndex, 1);
      }
      cancelPrompt();
      return;
    }
    promptData.item.name = value.trim();
    _saveData();
    cancelPrompt();
    return;
  }

  // Legacy multi-step flow (fallback)
  const promptStep = AppState.getPromptStep();
  if (promptStep === 0) {
    if (!value.trim()) {
      _showMessage('Name is required');
      _updateView();
      return;
    }
    promptData.name = value.trim();
    AppState.setPromptStep(1);
    _updateView();
  } else if (promptStep === 1) {
    promptData.description = value.trim();
    finishAdd();
  }
}

function finishAdd() {
  const promptData = AppState.getPromptData();
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();

  const newItem = {
    id: generateId(),
    name: promptData.name,
    description: promptData.description || ''
  };

  if (promptData.type === 'priority') {
    const obj = data.objectives[selectedIdx];
    if (obj) obj.priorities.push(newItem);
  }

  _saveData();
  cancelPrompt();
}

function processEditStep(value) {
  const promptData = AppState.getPromptData();

  if (!value.trim()) {
    _showMessage('Name is required');
    _updateView();
    return;
  }
  promptData.newName = value.trim();
  finishEdit();
}

function finishEdit() {
  const promptData = AppState.getPromptData();
  promptData.item.name = promptData.newName;
  _saveData();
  cancelPrompt();
}

function processRefineStep(value) {
  const promptData = AppState.getPromptData();
  promptData.item.description = value.trim();
  _saveData();
  cancelPrompt();
}

// ========================================
// Confirm Operations
// ========================================

export function processConfirm(confirmed) {
  const promptData = AppState.getPromptData();
  const promptTargetIndex = AppState.getPromptTargetIndex();
  const promptTargetSection = AppState.getPromptTargetSection();
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();

  if (confirmed && promptData.action === 'delete') {
    if (promptTargetSection === 'objectives') {
      data.objectives.splice(promptTargetIndex, 1);
      let newIdx = Math.min(selectedIdx, data.objectives.length - 1);
      if (newIdx < 0) newIdx = 0;
      AppState.setSelectedObjectiveIndex(newIdx);
    } else if (promptTargetSection === 'priorities') {
      const obj = data.objectives[selectedIdx];
      if (obj) obj.priorities.splice(promptTargetIndex, 1);
    } else if (promptTargetSection === 'steps') {
      const obj = data.objectives[selectedIdx];
      if (obj) obj.steps.splice(promptTargetIndex, 1);
    }
    _saveData();
  }
  cancelPrompt();
}

// ========================================
// Cancel
// ========================================

export function cancelPrompt() {
  const promptMode = AppState.getPromptMode();
  const promptData = AppState.getPromptData();
  const promptTargetIndex = AppState.getPromptTargetIndex();
  const promptTargetSection = AppState.getPromptTargetSection();
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();

  // Skip any pending blur handlers
  AppState.setSkipBlurHandler(true);

  // Remove placeholder items if adding was cancelled
  if (promptMode === 'add' && promptData.item) {
    if (promptTargetSection === 'objectives') {
      const obj = data.objectives[promptTargetIndex];
      if (obj && !obj.name.trim()) {
        data.objectives.splice(promptTargetIndex, 1);
        AppState.setSelectedObjectiveIndex(Math.max(0, data.objectives.length - 1));
      }
    } else if (promptTargetSection === 'priorities') {
      const obj = data.objectives[selectedIdx];
      if (obj && obj.priorities[promptTargetIndex] && !obj.priorities[promptTargetIndex].name.trim()) {
        obj.priorities.splice(promptTargetIndex, 1);
      }
    } else if (promptTargetSection === 'steps') {
      const obj = data.objectives[selectedIdx];
      if (obj && obj.steps[promptTargetIndex] && !obj.steps[promptTargetIndex].name.trim()) {
        obj.steps.splice(promptTargetIndex, 1);
      }
    }
  }

  AppState.resetPromptState();
  _updateView();
}

// ========================================
// Helpers
// ========================================

function restoreElementInPlace(contentEditable, listItem, text) {
  contentEditable.removeAttribute('contenteditable');
  contentEditable.removeAttribute('spellcheck');
  contentEditable.textContent = text;
}

/**
 * Focus prompt input after render
 */
export function focusPromptInput() {
  const promptMode = AppState.getPromptMode();
  if (!promptMode) return;

  setTimeout(() => {
    const contentEditable = document.querySelector('.list-item-content[contenteditable="true"], .side-item-name[contenteditable="true"]');
    if (contentEditable) {
      placeCaretAtEnd(contentEditable);
      contentEditable.addEventListener('blur', () => {
        if (AppState.shouldSkipBlurHandler()) {
          AppState.setSkipBlurHandler(false);
          return;
        }
        if (AppState.getPromptMode()) processPromptInput(contentEditable.textContent);
      }, { once: true });
      return;
    }

    const input = document.querySelector('.prompt-input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
      if (input.tagName === 'TEXTAREA') {
        autoResizeTextarea(input);
        input.addEventListener('input', () => autoResizeTextarea(input));
      }
      input.addEventListener('blur', () => {
        if (AppState.shouldSkipBlurHandler()) {
          AppState.setSkipBlurHandler(false);
          return;
        }
        if (AppState.getPromptMode()) processPromptInput(input.value);
      }, { once: true });
    }
  }, 0);
}

// ========================================
// Default Export
// ========================================

export default {
  setCallbacks,
  startAddObjective,
  startAddPriority,
  startLogStep,
  startEditInPlace,
  startEditObjectiveTitle,
  startEditFolderTitle,
  commitEditInPlace,
  commitObjectiveTitleEdit,
  commitFolderTitleEdit,
  processPromptInput,
  processConfirm,
  cancelPrompt,
  focusPromptInput
};

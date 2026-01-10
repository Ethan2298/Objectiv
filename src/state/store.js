/**
 * State Store Module
 *
 * Centralized state management for the application.
 * Provides a clear state shape and controlled mutations.
 */

// ========================================
// State Shape
// ========================================

const state = {
  // Currently selected objective index in side list
  selectedObjectiveIndex: 0,

  // Edit/prompt state
  editing: {
    mode: null,      // null, 'add', 'edit', 'refine', 'confirm'
    step: 0,         // Multi-step prompt progress
    section: null,   // 'objectives', 'priorities', 'steps'
    index: -1,       // Index of item being edited
    data: {},        // Additional edit context
    skipBlur: false  // Prevents stale blur handlers
  },

  // Clarity scoring queue
  clarity: {
    queue: [],
    processing: false
  }
};

// ========================================
// Getters
// ========================================

export function getSelectedObjectiveIndex() {
  return state.selectedObjectiveIndex;
}

export function getEditingState() {
  return { ...state.editing };
}

export function isEditing() {
  return state.editing.mode !== null;
}

export function isEditingItem(section, index) {
  return state.editing.section === section && state.editing.index === index;
}

export function getClarityQueue() {
  return [...state.clarity.queue];
}

export function isClarityProcessing() {
  return state.clarity.processing;
}

// ========================================
// Actions - Selection
// ========================================

export function selectObjective(index) {
  state.selectedObjectiveIndex = index;
}

// ========================================
// Actions - Editing
// ========================================

/**
 * Start editing an item
 */
export function startEdit(mode, section, index, data = {}) {
  state.editing = {
    mode,
    step: 0,
    section,
    index,
    data,
    skipBlur: false
  };
}

/**
 * Update edit data during multi-step prompts
 */
export function updateEditData(updates) {
  state.editing.data = { ...state.editing.data, ...updates };
}

/**
 * Advance to next step in multi-step prompt
 */
export function advanceEditStep() {
  state.editing.step++;
}

/**
 * Set skip blur flag (prevents double-processing on edit transitions)
 */
export function setSkipBlur(value) {
  state.editing.skipBlur = value;
}

/**
 * Check and clear skip blur flag
 */
export function checkAndClearSkipBlur() {
  if (state.editing.skipBlur) {
    state.editing.skipBlur = false;
    return true;
  }
  return false;
}

/**
 * Cancel current edit and reset state
 */
export function cancelEdit() {
  state.editing = {
    mode: null,
    step: 0,
    section: null,
    index: -1,
    data: {},
    skipBlur: false
  };
}

/**
 * Commit current edit (same as cancel but semantically different)
 */
export function commitEdit() {
  cancelEdit();
}

// ========================================
// Actions - Clarity Queue
// ========================================

/**
 * Add item to clarity scoring queue
 */
export function enqueueClarityItem(item) {
  if (!item._clarityQueued && !item._clarityLoading) {
    item._clarityQueued = true;
    state.clarity.queue.push(item);
  }
}

/**
 * Get next item from clarity queue
 */
export function dequeueClarityItem() {
  const item = state.clarity.queue.shift();
  if (item) {
    item._clarityQueued = false;
  }
  return item;
}

/**
 * Set clarity processing state
 */
export function setClarityProcessing(value) {
  state.clarity.processing = value;
}

/**
 * Check if clarity queue has items
 */
export function hasClarityItems() {
  return state.clarity.queue.length > 0;
}

// ========================================
// Legacy Compatibility
// ========================================

/**
 * Get legacy prompt state variables
 * Used during transition to new state management
 */
export function getLegacyPromptState() {
  return {
    promptMode: state.editing.mode,
    promptStep: state.editing.step,
    promptData: state.editing.data,
    promptTargetIndex: state.editing.index,
    promptTargetSection: state.editing.section,
    skipBlurHandler: state.editing.skipBlur
  };
}

/**
 * Set legacy prompt state
 * Used during transition to new state management
 */
export function setLegacyPromptState(promptMode, promptStep, promptData, promptTargetIndex, promptTargetSection) {
  state.editing = {
    mode: promptMode,
    step: promptStep,
    section: promptTargetSection,
    index: promptTargetIndex,
    data: promptData,
    skipBlur: false
  };
}

// Default export
export default {
  // Getters
  getSelectedObjectiveIndex,
  getEditingState,
  isEditing,
  isEditingItem,
  getClarityQueue,
  isClarityProcessing,

  // Selection
  selectObjective,

  // Editing
  startEdit,
  updateEditData,
  advanceEditStep,
  setSkipBlur,
  checkAndClearSkipBlur,
  cancelEdit,
  commitEdit,

  // Clarity
  enqueueClarityItem,
  dequeueClarityItem,
  setClarityProcessing,
  hasClarityItems,

  // Legacy
  getLegacyPromptState,
  setLegacyPromptState
};

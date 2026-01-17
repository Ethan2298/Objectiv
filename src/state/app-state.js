/**
 * App State Module
 *
 * Centralized mutable state for the application.
 * Contains all global state variables that were previously inline in index.html.
 */

// ========================================
// Application State
// ========================================

const state = {
  // Data
  data: { objectives: [], folders: [] },

  // Navigation state
  selectedObjectiveIndex: 0,
  viewMode: 'objective', // 'objective' | 'folder' | 'empty'

  // Mobile state
  isMobile: false,

  // Hover preview state
  hoverPreviewActive: false,
  hoverPreviewItemData: null,

  // Prompt state (add/edit/refine/log/confirm workflow)
  promptMode: null, // null | 'add' | 'edit' | 'refine' | 'log' | 'confirm'
  promptStep: 0,
  promptData: {},
  promptTargetIndex: -1,
  promptTargetSection: null,
  skipBlurHandler: false,

  // Scroll-based selection state
  contentLoadTimeout: null,
  lastLoadedIndex: -1,
  CONTENT_LOAD_DEBOUNCE: 150,

  // Next Step timer state
  nextStepTimerInterval: null,

  // Drag state
  dragInsertPosition: null,
  draggedItem: null,

  // System status
  systemStatus: {
    platform: 'browser',
    localStorage: false,
    taglines: false,
    clarityAPI: false,
    errors: []
  }
};

// ========================================
// Getters
// ========================================

export function getData() {
  return state.data;
}

export function getObjectives() {
  return state.data.objectives;
}

export function getFolders() {
  return state.data.folders;
}

export function getSelectedObjectiveIndex() {
  return state.selectedObjectiveIndex;
}

export function getSelectedObjective() {
  return state.data.objectives[state.selectedObjectiveIndex] || null;
}

export function getViewMode() {
  return state.viewMode;
}

export function isMobile() {
  return state.isMobile;
}

export function getPromptMode() {
  return state.promptMode;
}

export function getPromptStep() {
  return state.promptStep;
}

export function getPromptData() {
  return state.promptData;
}

export function getPromptTargetIndex() {
  return state.promptTargetIndex;
}

export function getPromptTargetSection() {
  return state.promptTargetSection;
}

export function shouldSkipBlurHandler() {
  return state.skipBlurHandler;
}

export function getContentLoadTimeout() {
  return state.contentLoadTimeout;
}

export function getLastLoadedIndex() {
  return state.lastLoadedIndex;
}

export function getContentLoadDebounce() {
  return state.CONTENT_LOAD_DEBOUNCE;
}

export function getNextStepTimerInterval() {
  return state.nextStepTimerInterval;
}

export function getDragInsertPosition() {
  return state.dragInsertPosition;
}

export function getDraggedItem() {
  return state.draggedItem;
}

export function getSystemStatus() {
  return state.systemStatus;
}

export function isHoverPreviewActive() {
  return state.hoverPreviewActive;
}

export function getHoverPreviewItemData() {
  return state.hoverPreviewItemData;
}

// ========================================
// Setters
// ========================================

export function setData(newData) {
  state.data = newData;
}

export function setObjectives(objectives) {
  state.data.objectives = objectives;
}

export function setFolders(folders) {
  state.data.folders = folders;
}

export function setSelectedObjectiveIndex(index) {
  state.selectedObjectiveIndex = index;
}

export function setViewMode(mode) {
  state.viewMode = mode;
}

export function setIsMobile(value) {
  state.isMobile = value;
}

export function setPromptMode(mode) {
  state.promptMode = mode;
}

export function setPromptStep(step) {
  state.promptStep = step;
}

export function setPromptData(data) {
  state.promptData = data;
}

export function setPromptTargetIndex(index) {
  state.promptTargetIndex = index;
}

export function setPromptTargetSection(section) {
  state.promptTargetSection = section;
}

export function setSkipBlurHandler(value) {
  state.skipBlurHandler = value;
}

export function setContentLoadTimeout(timeout) {
  state.contentLoadTimeout = timeout;
}

export function setLastLoadedIndex(index) {
  state.lastLoadedIndex = index;
}

export function setNextStepTimerInterval(interval) {
  state.nextStepTimerInterval = interval;
}

export function setDragInsertPosition(position) {
  state.dragInsertPosition = position;
}

export function setDraggedItem(item) {
  state.draggedItem = item;
}

export function setHoverPreviewActive(value) {
  state.hoverPreviewActive = value;
}

export function setHoverPreviewItemData(data) {
  state.hoverPreviewItemData = data;
}

// ========================================
// System Status
// ========================================

export function updateSystemStatus(key, value) {
  state.systemStatus[key] = value;
}

export function reportError(context, error) {
  const msg = `[${context}] ${error.message || error}`;
  state.systemStatus.errors.push(msg);
  console.error(msg, error);
}

// ========================================
// Prompt State Helpers
// ========================================

export function resetPromptState() {
  state.promptMode = null;
  state.promptStep = 0;
  state.promptData = {};
  state.promptTargetIndex = -1;
  state.promptTargetSection = null;
}

export function setPromptState({ mode, step = 0, data = {}, targetIndex = -1, targetSection = null }) {
  state.promptMode = mode;
  state.promptStep = step;
  state.promptData = data;
  state.promptTargetIndex = targetIndex;
  state.promptTargetSection = targetSection;
}

// ========================================
// Content Load Helpers
// ========================================

export function clearContentLoadTimeout() {
  if (state.contentLoadTimeout) {
    clearTimeout(state.contentLoadTimeout);
    state.contentLoadTimeout = null;
  }
}

export function resetContentLoadTracking() {
  state.lastLoadedIndex = -1;
}

// ========================================
// Timer Helpers
// ========================================

export function clearNextStepTimerInterval() {
  if (state.nextStepTimerInterval) {
    clearInterval(state.nextStepTimerInterval);
    state.nextStepTimerInterval = null;
  }
}

// ========================================
// Default Export
// ========================================

export default {
  // Getters
  getData,
  getObjectives,
  getFolders,
  getSelectedObjectiveIndex,
  getSelectedObjective,
  getViewMode,
  isMobile,
  getPromptMode,
  getPromptStep,
  getPromptData,
  getPromptTargetIndex,
  getPromptTargetSection,
  shouldSkipBlurHandler,
  getContentLoadTimeout,
  getLastLoadedIndex,
  getContentLoadDebounce,
  getNextStepTimerInterval,
  getDragInsertPosition,
  getDraggedItem,
  getSystemStatus,
  isHoverPreviewActive,
  getHoverPreviewItemData,

  // Setters
  setData,
  setObjectives,
  setFolders,
  setSelectedObjectiveIndex,
  setViewMode,
  setIsMobile,
  setPromptMode,
  setPromptStep,
  setPromptData,
  setPromptTargetIndex,
  setPromptTargetSection,
  setSkipBlurHandler,
  setContentLoadTimeout,
  setLastLoadedIndex,
  setNextStepTimerInterval,
  setDragInsertPosition,
  setDraggedItem,
  setHoverPreviewActive,
  setHoverPreviewItemData,

  // System Status
  updateSystemStatus,
  reportError,

  // Helpers
  resetPromptState,
  setPromptState,
  clearContentLoadTimeout,
  resetContentLoadTracking,
  clearNextStepTimerInterval
};

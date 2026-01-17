/**
 * Next Step Timer Component
 *
 * Timer UI and logic for tracking time spent on the next step.
 */

import AppState from '../state/app-state.js';
import { formatTimerDisplay, formatDuration, generateId } from '../utils.js';

// ========================================
// Callbacks (set by app.js)
// ========================================

let _saveData = () => {};
let _renderContentView = () => {};

export function setCallbacks({ saveData, renderContentView }) {
  if (saveData) _saveData = saveData;
  if (renderContentView) _renderContentView = renderContentView;
}

// ========================================
// Timer Control
// ========================================

/**
 * Start the next step timer
 */
export function startNextStepTimer() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  // Initialize nextStep if needed
  if (!obj.nextStep) {
    obj.nextStep = { text: '', elapsedSeconds: 0, isRunning: false };
  }

  obj.nextStep.isRunning = true;

  // Clear any existing interval
  AppState.clearNextStepTimerInterval();

  // Update timer every second
  const interval = setInterval(() => {
    if (obj.nextStep && obj.nextStep.isRunning) {
      obj.nextStep.elapsedSeconds++;
      updateNextStepTimerDisplay(obj);
    }
  }, 1000);

  AppState.setNextStepTimerInterval(interval);

  // Update UI immediately
  updateNextStepTimerDisplay(obj);
  updateNextStepPlayButton(obj);
}

/**
 * Pause the next step timer
 */
export function pauseNextStepTimer() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj || !obj.nextStep) return;

  obj.nextStep.isRunning = false;

  AppState.clearNextStepTimerInterval();

  // Update UI
  updateNextStepTimerDisplay(obj);
  updateNextStepPlayButton(obj);

  // Save to file
  _saveData();
}

/**
 * Toggle timer play/pause
 */
export function toggleNextStepTimer() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  if (obj.nextStep?.isRunning) {
    pauseNextStepTimer();
  } else {
    startNextStepTimer();
  }
}

/**
 * Complete next step - move to steps list
 */
export function completeNextStep() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj || !obj.nextStep || !obj.nextStep.text.trim()) return;

  // Pause timer first
  if (obj.nextStep.isRunning) {
    pauseNextStepTimer();
  }

  // Create new step from next step
  const newStep = {
    id: generateId(),
    name: obj.nextStep.text.trim(),
    loggedAt: new Date().toISOString(),
    orderNumber: (obj.steps?.length || 0) + 1,
    duration: obj.nextStep.elapsedSeconds
  };

  // Add to steps
  if (!obj.steps) obj.steps = [];
  obj.steps.push(newStep);

  // Clear next step
  obj.nextStep = { text: '', elapsedSeconds: 0, isRunning: false };

  // Save and re-render
  _saveData();
  _renderContentView();
}

/**
 * Save next step text on input
 */
export function saveNextStepText(text) {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (!obj) return;

  if (!obj.nextStep) {
    obj.nextStep = { text: '', elapsedSeconds: 0, isRunning: false };
  }

  obj.nextStep.text = text;
  _saveData();
}

/**
 * Auto-pause timer when switching objectives or closing app
 */
export function autoPauseNextStepTimer() {
  const data = AppState.getData();
  const selectedIdx = AppState.getSelectedObjectiveIndex();
  const obj = data.objectives[selectedIdx];

  if (obj?.nextStep?.isRunning) {
    pauseNextStepTimer();
  }
}

// ========================================
// UI Update Helpers
// ========================================

/**
 * Update timer display without re-rendering
 */
export function updateNextStepTimerDisplay(obj) {
  const timerEl = document.querySelector('.next-step-timer');
  if (timerEl && obj.nextStep) {
    timerEl.textContent = formatTimerDisplay(obj.nextStep.elapsedSeconds);
    timerEl.classList.toggle('running', obj.nextStep.isRunning);
  }
}

/**
 * Update play/pause button without re-rendering
 */
export function updateNextStepPlayButton(obj) {
  const btn = document.querySelector('.next-step-play-btn');
  if (btn && obj.nextStep) {
    btn.classList.toggle('running', obj.nextStep.isRunning);
  }
}

// ========================================
// Render
// ========================================

/**
 * Render next step section in content view
 * @param {HTMLElement} container - Container element
 * @param {Object} obj - Objective data
 */
export function renderContentNextStep(container, obj) {
  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = 'NEXT STEP';
  container.appendChild(header);

  // Initialize nextStep if needed
  if (!obj.nextStep) {
    obj.nextStep = { text: '', elapsedSeconds: 0, isRunning: false };
  }

  const item = document.createElement('div');
  item.className = 'next-step-item';

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'next-step-checkbox';
  checkbox.onchange = () => {
    if (checkbox.checked) {
      completeNextStep();
    }
  };
  item.appendChild(checkbox);

  // Editable content
  const content = document.createElement('span');
  content.className = 'next-step-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.dataset.placeholder = 'What do you want to do next?';
  content.textContent = obj.nextStep.text || '';

  // Enable spellcheck on focus
  content.onfocus = () => {
    content.spellcheck = true;
  };

  // Debounced save on input
  let saveTimeout = null;
  content.oninput = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveNextStepText(content.textContent);
    }, 500);
  };

  // Save immediately on blur and disable spellcheck
  content.onblur = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveNextStepText(content.textContent);
    content.spellcheck = false;
  };

  item.appendChild(content);

  // Meta area (timer + play button)
  const meta = document.createElement('span');
  meta.className = 'next-step-meta';

  // Timer display
  const timer = document.createElement('span');
  timer.className = 'next-step-timer';
  if (obj.nextStep.isRunning) timer.classList.add('running');
  timer.textContent = formatTimerDisplay(obj.nextStep.elapsedSeconds);
  meta.appendChild(timer);

  // Edit button (shows on hover)
  const editBtn = document.createElement('button');
  editBtn.className = 'next-step-edit-btn';
  editBtn.textContent = 'edit';
  editBtn.onclick = (e) => {
    e.preventDefault();
    content.focus();
  };
  meta.appendChild(editBtn);

  // Play/Pause button
  const playBtn = document.createElement('button');
  playBtn.className = 'next-step-play-btn';
  if (obj.nextStep.isRunning) playBtn.classList.add('running');
  playBtn.onclick = (e) => {
    e.preventDefault();
    toggleNextStepTimer();
  };
  meta.appendChild(playBtn);

  item.appendChild(meta);
  container.appendChild(item);

  // Restart interval if timer was running
  if (obj.nextStep.isRunning && !AppState.getNextStepTimerInterval()) {
    const interval = setInterval(() => {
      if (obj.nextStep && obj.nextStep.isRunning) {
        obj.nextStep.elapsedSeconds++;
        updateNextStepTimerDisplay(obj);
      }
    }, 1000);
    AppState.setNextStepTimerInterval(interval);
  }
}

// ========================================
// Default Export
// ========================================

export default {
  setCallbacks,
  startNextStepTimer,
  pauseNextStepTimer,
  toggleNextStepTimer,
  completeNextStep,
  saveNextStepText,
  autoPauseNextStepTimer,
  updateNextStepTimerDisplay,
  updateNextStepPlayButton,
  renderContentNextStep
};

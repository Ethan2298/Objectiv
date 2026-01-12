/**
 * Clarity Scoring Module
 *
 * Handles LLM-based clarity scoring with queuing to prevent flicker.
 */

import { calculateClarity } from './data/repository.js';

// Re-export for convenience
export { calculateClarity };

// Queue state
let clarityQueue = [];
let clarityProcessing = false;

// Callback for when scores are updated
let onScoresUpdated = null;

/**
 * Set callback for when clarity scores are updated
 */
export function setOnScoresUpdated(callback) {
  onScoresUpdated = callback;
}

/**
 * Check if Clarity API is available (Electron only)
 */
export function isClarityAvailable() {
  return !!(window.electronAPI?.calculateClarity);
}

/**
 * CLARITY_DISABLED: LLM clarity calculation disabled
 * See "Archived code/clarity-badge-scoring.md" for original implementation
 */
export function refreshClarity(item, isPromptMode = false) {
  // CLARITY_DISABLED: Feature disabled, return early to skip API calls
  return;
}

/**
 * Process the clarity scoring queue
 */
async function processClarityQueue() {
  // Skip in browser mode (no Electron API)
  if (!isClarityAvailable()) {
    clarityQueue.forEach(item => {
      item._clarityQueued = false;
      item._clarityLoading = false;
    });
    clarityQueue = [];
    clarityProcessing = false;
    return;
  }

  while (clarityQueue.length > 0) {
    const item = clarityQueue.shift();
    item._clarityQueued = false;

    const cacheKey = `${item.name}|${item.description || ''}`;
    if (item._clarityKey === cacheKey && item.clarityScore !== undefined) {
      continue; // Already done
    }

    try {
      item._clarityLoading = true;
      console.log('Requesting clarity for:', item.name);

      const result = await window.electronAPI.calculateClarity(item.name, item.description || '');
      item._clarityLoading = false;

      if (result.error) {
        console.log('Clarity error:', result.error);
      } else if (result.score !== null) {
        console.log('Clarity score:', result.score + '%');
        item.clarityScore = result.score;
        item._clarityKey = cacheKey;
      }
    } catch (err) {
      item._clarityLoading = false;
      console.error('Clarity calculation failed:', err);
    }
  }

  clarityProcessing = false;

  // Notify that scores were updated
  if (onScoresUpdated) {
    onScoresUpdated();
  }
}

/**
 * CLARITY_DISABLED: Refresh clarity for all items (disabled)
 * See "Archived code/clarity-badge-scoring.md" for original implementation
 */
export async function refreshAllClarity(data) {
  // CLARITY_DISABLED: Feature disabled, return early
  return;
}

/**
 * CLARITY_DISABLED: Get clarity display HTML for meta column
 * Now returns only edit button (clarity scoring disabled)
 * See "Archived code/clarity-badge-scoring.md" for original implementation
 */
export function getClarityMeta(item, section = 'objectives', index = 0) {
  // CLARITY_DISABLED: Original showed score + badge, now just edit button
  return `<span class="edit-btn" data-section="${section}" data-index="${index}">edit</span>`;
}

export default {
  calculateClarity,
  refreshClarity,
  refreshAllClarity,
  getClarityMeta,
  isClarityAvailable,
  setOnScoresUpdated
};

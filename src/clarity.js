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
 * Request LLM clarity calculation for an item (queued to prevent flicker)
 */
export function refreshClarity(item, isPromptMode = false) {
  // Don't refresh during prompts (editing/adding) to avoid disruption
  if (isPromptMode) {
    console.log('Skipping clarity (prompt mode):', item.name);
    return;
  }

  if (!item.name || !item.name.trim()) {
    item.clarityScore = 0;
    return;
  }

  // Check if we already have a score for this exact name+description combo
  const cacheKey = `${item.name}|${item.description || ''}`;
  if (item._clarityKey === cacheKey && item.clarityScore !== undefined) {
    console.log('Already scored:', item.name, item.clarityScore + '%');
    return;
  }

  // Don't queue duplicates
  if (item._clarityQueued || item._clarityLoading) {
    console.log('Already queued/loading:', item.name);
    return;
  }

  console.log('Queuing for clarity:', item.name);
  item._clarityQueued = true;
  clarityQueue.push(item);

  // Process queue after a short delay (batch multiple items)
  if (!clarityProcessing) {
    clarityProcessing = true;
    setTimeout(processClarityQueue, 100);
  }
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
 * Refresh clarity for all items in data
 */
export async function refreshAllClarity(data) {
  const items = [...data.objectives];
  data.objectives.forEach(obj => {
    if (obj.priorities) items.push(...obj.priorities);
  });

  for (const item of items) {
    const cacheKey = `${item.name}|${item.description || ''}`;
    if (item._clarityKey !== cacheKey) {
      refreshClarity(item, false);
    }
  }
}

/**
 * Get clarity display HTML for meta column
 */
export function getClarityMeta(item, section = 'objectives', index = 0) {
  const clarity = calculateClarity(item);

  if (item._clarityLoading) {
    return `<span class="clarity-score">...</span><span class="edit-btn" data-section="${section}" data-index="${index}">edit</span>`;
  }

  let scoreText;
  if (item.clarityScore !== undefined && item.clarityScore !== null) {
    scoreText = `${item.clarityScore}%`;
  } else {
    scoreText = '—';
  }

  return `<span class="clarity-score">${scoreText}</span><span class="clarity-badge">${clarity}</span><span class="edit-btn" data-section="${section}" data-index="${index}">edit</span>`;
}

export default {
  calculateClarity,
  refreshClarity,
  refreshAllClarity,
  getClarityMeta,
  isClarityAvailable,
  setOnScoresUpdated
};

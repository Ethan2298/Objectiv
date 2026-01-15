/**
 * Side List State Module
 *
 * State management for the side list navigation.
 * Manages objectives list only.
 */

// ========================================
// State Shape
// ========================================

const state = {
  // Current selection index in the flat navigable list
  selectedIndex: 0,

  // Cached flat list of navigable items
  items: []
};

// ========================================
// Item Types
// ========================================

export const ItemType = {
  OBJECTIVE: 'objective',
  ADD_OBJECTIVE: 'add-objective'
};

// ========================================
// Getters
// ========================================

export function getSelectedIndex() {
  return state.selectedIndex;
}

export function getItems() {
  return state.items;
}

export function getSelectedItem() {
  return state.items[state.selectedIndex] || null;
}

// ========================================
// Actions - Selection
// ========================================

export function setSelectedIndex(index) {
  if (index >= 0 && index < state.items.length) {
    state.selectedIndex = index;
  }
}

export function selectNext() {
  const newIndex = state.selectedIndex + 1;
  if (newIndex < state.items.length) {
    state.selectedIndex = newIndex;
    return true;
  }
  return false;
}

export function selectPrev() {
  const newIndex = state.selectedIndex - 1;
  if (newIndex >= 0) {
    state.selectedIndex = newIndex;
    return true;
  }
  return false;
}

/**
 * Select item by finding it in the list
 */
export function selectItem(type, identifier) {
  const index = state.items.findIndex(item => {
    if (item.type !== type) return false;
    if (type === ItemType.OBJECTIVE) return item.index === identifier;
    if (type === ItemType.ADD_OBJECTIVE) return true;
    return false;
  });
  if (index !== -1) {
    state.selectedIndex = index;
    return true;
  }
  return false;
}

// ========================================
// Build Navigable Items List
// ========================================

/**
 * Build the flat list of all navigable items
 * Called whenever objectives change
 *
 * @param {Object} options
 * @param {Array} options.objectives - Array of objective objects
 * @param {boolean} options.isAddingObjective - Whether currently adding an objective
 */
export function rebuildItems({ objectives = [], isAddingObjective = false }) {
  const items = [];

  // Add objectives
  objectives.forEach((obj, index) => {
    items.push({
      type: ItemType.OBJECTIVE,
      index,
      data: obj,
      name: obj.name
    });
  });

  // Add "Add objective" option (unless currently adding)
  if (!isAddingObjective) {
    items.push({
      type: ItemType.ADD_OBJECTIVE,
      name: '+ Add objective'
    });
  }

  state.items = items;

  // Clamp selection index
  if (state.selectedIndex >= items.length) {
    state.selectedIndex = Math.max(0, items.length - 1);
  }

  return items;
}

// ========================================
// Persistence
// ========================================

const STORAGE_KEY = 'objectiv-sidelist-state';

export function saveState() {
  try {
    const data = {
      selectedIndex: state.selectedIndex
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save side list state:', e);
  }
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      state.selectedIndex = data.selectedIndex || 0;
    }
  } catch (e) {
    console.warn('Failed to load side list state:', e);
  }
}

// ========================================
// Initialization
// ========================================

export function init() {
  loadState();
}

// ========================================
// Default Export
// ========================================

export default {
  ItemType,

  // Getters
  getSelectedIndex,
  getItems,
  getSelectedItem,

  // Selection
  setSelectedIndex,
  selectNext,
  selectPrev,
  selectItem,

  // Building
  rebuildItems,

  // Persistence
  saveState,
  loadState,
  init
};

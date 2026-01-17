/**
 * Mobile Module
 *
 * Mobile responsive behavior and view switching.
 */

import AppState from '../state/app-state.js';

// ========================================
// Constants
// ========================================

const MOBILE_BREAKPOINT = 768;

// ========================================
// Mobile State
// ========================================

/**
 * Check if current viewport is mobile
 * @returns {boolean}
 */
export function checkIsMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * Initialize mobile state
 */
export function initMobileState() {
  const isMobile = checkIsMobile();
  AppState.setIsMobile(isMobile);

  const app = document.getElementById('app');
  if (!app) return;

  if (isMobile) {
    app.classList.add('mobile-list-view');
    app.classList.remove('mobile-detail-view', 'sidebar-collapsed');
  } else {
    app.classList.remove('mobile-list-view', 'mobile-detail-view');
  }
}

// ========================================
// View Switching
// ========================================

/**
 * Switch between list/detail views on mobile
 * @param {'list' | 'detail'} mode - The view mode
 */
export function setMobileView(mode) {
  if (!AppState.isMobile()) return;

  const app = document.getElementById('app');
  if (!app) return;

  app.classList.add('transitioning');
  setTimeout(() => app.classList.remove('transitioning'), 250);

  if (mode === 'detail') {
    app.classList.remove('mobile-list-view');
    app.classList.add('mobile-detail-view');
  } else {
    app.classList.remove('mobile-detail-view');
    app.classList.add('mobile-list-view');
  }
}

/**
 * Go back to list view on mobile
 */
export function goBackToList() {
  setMobileView('list');
}

// ========================================
// Resize Handler
// ========================================

/**
 * Handle window resize for mobile transitions
 * @param {Function} onMobileChange - Callback when transitioning between mobile/desktop
 */
export function initResizeHandler(onMobileChange = null) {
  window.addEventListener('resize', () => {
    const wasMobile = AppState.isMobile();
    const isMobile = checkIsMobile();
    AppState.setIsMobile(isMobile);

    const app = document.getElementById('app');
    if (!app) return;

    if (isMobile && !wasMobile) {
      // Desktop -> Mobile
      app.classList.remove('sidebar-collapsed');

      // Determine which view to show
      const data = AppState.getData();
      const selectedObjectiveIndex = AppState.getSelectedObjectiveIndex();
      const hasSelectedObjective = data.objectives && data.objectives.length > 0 && selectedObjectiveIndex >= 0;

      if (hasSelectedObjective) {
        setMobileView('detail');
      } else {
        setMobileView('list');
      }

      if (onMobileChange) onMobileChange('mobile');
    } else if (!isMobile && wasMobile) {
      // Mobile -> Desktop
      app.classList.remove('mobile-list-view', 'mobile-detail-view');
      if (onMobileChange) onMobileChange('desktop');
    }
  });
}

/**
 * Initialize back button handler
 */
export function initBackButton() {
  document.getElementById('btn-mobile-back')?.addEventListener('click', () => {
    setMobileView('list');
  });
}

// ========================================
// Initialize
// ========================================

/**
 * Initialize mobile module
 * @param {Function} onMobileChange - Callback when transitioning between mobile/desktop
 */
export function init(onMobileChange = null) {
  initMobileState();
  initResizeHandler(onMobileChange);
  initBackButton();
}

// ========================================
// Default Export
// ========================================

export default {
  MOBILE_BREAKPOINT,
  checkIsMobile,
  initMobileState,
  setMobileView,
  goBackToList,
  initResizeHandler,
  initBackButton,
  init
};

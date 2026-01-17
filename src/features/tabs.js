// ========================================
// Header Tabs - Per-tab state management
// ========================================

import * as TabState from '../state/tab-state.js';

let _callbacks = {
  updateView: null
};

/**
 * Set callbacks for tabs module
 */
export function setCallbacks(callbacks) {
  _callbacks = { ..._callbacks, ...callbacks };
}

/**
 * Initialize tab functionality
 */
export function initTabs() {
  const tabsContainer = document.querySelector('.header-tabs');
  if (!tabsContainer) return;

  // Initialize TabState (syncs with DOM if no saved state)
  TabState.init();

  // Sync DOM with TabState (in case state was loaded from storage)
  syncDomWithState();

  // Delegate click events
  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.header-tab');
    const closeBtn = e.target.closest('.tab-close');
    const addBtn = e.target.closest('.tab-add');

    if (closeBtn && tab) {
      e.stopPropagation();
      handleCloseTab(tab);
    } else if (addBtn) {
      handleCreateTab();
    } else if (tab) {
      handleSelectTab(tab);
    }
  });
}

/**
 * Sync DOM tabs with TabState
 */
function syncDomWithState() {
  const tabsContainer = document.querySelector('.header-tabs');
  if (!tabsContainer) return;

  const domTabs = tabsContainer.querySelectorAll('.header-tab');
  const stateTabIds = TabState.getTabIds();
  const activeTabId = TabState.getActiveTabId();

  // If state has tabs that don't exist in DOM, we need to create them
  // But first, let's check if DOM tabs match state tabs
  const domTabIds = Array.from(domTabs).map(t => t.dataset.tabId);

  // Simple case: DOM tabs match state - just update active class and titles
  if (domTabIds.length === stateTabIds.length &&
      domTabIds.every(id => stateTabIds.includes(id))) {
    domTabs.forEach(tabEl => {
      const tabId = tabEl.dataset.tabId;
      const isActive = tabId === activeTabId;
      tabEl.classList.toggle('active', isActive);

      // Update title from state
      const tabData = TabState.getTabById(tabId);
      if (tabData) {
        const titleEl = tabEl.querySelector('.tab-title');
        if (titleEl) titleEl.textContent = tabData.title;
      }
    });
    return;
  }

  // Complex case: need to rebuild DOM tabs from state
  // Remove all existing tabs
  domTabs.forEach(t => t.remove());

  // Add tabs from state
  const addBtn = tabsContainer.querySelector('.tab-add');
  stateTabIds.forEach(tabId => {
    const tabData = TabState.getTabById(tabId);
    if (tabData) {
      const tab = document.createElement('div');
      tab.className = 'header-tab' + (tabId === activeTabId ? ' active' : '');
      tab.dataset.tabId = tabId;
      tab.innerHTML = `
        <span class="tab-icon">${getTabIconHtml(tabData.icon)}</span>
        <span class="tab-title">${escapeHtml(tabData.title)}</span>
        <button class="tab-close" aria-label="Close tab">&times;</button>
      `;
      tabsContainer.insertBefore(tab, addBtn);
    }
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get icon HTML for a tab (handles both URL and built-in types)
 */
function getTabIconHtml(icon) {
  if (!icon) return getIconSvgInline('home');
  if (icon.startsWith('http') || icon.startsWith('data:')) {
    return `<img src="${escapeHtml(icon)}" alt="" />`;
  }
  return getIconSvgInline(icon);
}

/**
 * Get SVG icon markup for built-in icon types (inline version for initial render)
 */
function getIconSvgInline(iconType) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    objective: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  return icons[iconType] || icons.home;
}

/**
 * Get sidebar scroll position
 */
function getSidebarScrollPosition() {
  const sidebar = document.getElementById('sidebar');
  return sidebar ? sidebar.scrollTop : 0;
}

/**
 * Set sidebar scroll position
 */
function setSidebarScrollPosition(position) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.scrollTop = position;
}

/**
 * Handle tab selection
 */
function handleSelectTab(tabEl) {
  const tabId = tabEl.dataset.tabId;
  if (!tabId) return;

  const currentActiveId = TabState.getActiveTabId();
  if (tabId === currentActiveId) return; // Already active

  // Save current tab's scroll position
  TabState.setScrollPosition(getSidebarScrollPosition());

  // Switch tab in state
  TabState.switchTab(tabId);

  // Update DOM active class
  const tabs = document.querySelectorAll('.header-tab');
  tabs.forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');

  // Call updateView to refresh sidebar and content
  if (_callbacks.updateView) {
    _callbacks.updateView();
  }

  // Restore scroll position for new tab
  const scrollPos = TabState.getScrollPosition();
  requestAnimationFrame(() => {
    setSidebarScrollPosition(scrollPos);
  });
}

/**
 * Handle tab close
 */
function handleCloseTab(tabEl) {
  const tabId = tabEl.dataset.tabId;
  if (!tabId) return;

  const tabs = document.querySelectorAll('.header-tab');

  // Don't close if it's the last tab
  if (tabs.length <= 1) return;

  const wasActive = tabEl.classList.contains('active');
  const tabIndex = Array.from(tabs).indexOf(tabEl);

  // Close tab in state
  TabState.closeTab(tabId);

  // Remove from DOM
  tabEl.remove();

  // If closed tab was active, select the new active tab
  if (wasActive) {
    const newActiveId = TabState.getActiveTabId();
    const remainingTabs = document.querySelectorAll('.header-tab');

    remainingTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tabId === newActiveId);
    });

    // Update view for new active tab
    if (_callbacks.updateView) {
      _callbacks.updateView();
    }

    // Restore scroll position
    const scrollPos = TabState.getScrollPosition();
    requestAnimationFrame(() => {
      setSidebarScrollPosition(scrollPos);
    });
  }
}

/**
 * Handle tab creation
 */
function handleCreateTab() {
  const tabsContainer = document.querySelector('.header-tabs');
  if (!tabsContainer) return;

  const addBtn = tabsContainer.querySelector('.tab-add');

  // Save current tab's scroll position before switching
  TabState.setScrollPosition(getSidebarScrollPosition());

  // Create tab in state (this also sets it as active)
  const newTabId = TabState.createTab('Home');

  // Create DOM element
  const tab = document.createElement('div');
  tab.className = 'header-tab active';
  tab.dataset.tabId = newTabId;
  tab.innerHTML = `
    <span class="tab-icon">${getIconSvgInline('home')}</span>
    <span class="tab-title">Home</span>
    <button class="tab-close" aria-label="Close tab">&times;</button>
  `;

  // Remove active class from other tabs
  const tabs = document.querySelectorAll('.header-tab');
  tabs.forEach(t => t.classList.remove('active'));

  // Insert before the add button
  tabsContainer.insertBefore(tab, addBtn);

  // Update view to show new tab's content (home)
  if (_callbacks.updateView) {
    _callbacks.updateView();
  }
}

/**
 * Update the active tab's title (both state and DOM)
 */
export function updateActiveTabTitle(title) {
  // Update state
  TabState.setTabTitle(title);

  // Update DOM
  const activeTabId = TabState.getActiveTabId();
  const activeTabEl = document.querySelector(`.header-tab[data-tab-id="${activeTabId}"]`);
  if (activeTabEl) {
    const titleEl = activeTabEl.querySelector('.tab-title');
    if (titleEl) titleEl.textContent = title;
  }
}

/**
 * Update the active tab's icon (both state and DOM)
 * @param {string} icon - Icon type ('home', 'folder', 'objective', 'web') or favicon URL
 */
export function updateActiveTabIcon(icon) {
  // Update state
  TabState.setTabIcon(icon);

  // Update DOM
  const activeTabId = TabState.getActiveTabId();
  const activeTabEl = document.querySelector(`.header-tab[data-tab-id="${activeTabId}"]`);
  if (activeTabEl) {
    let iconEl = activeTabEl.querySelector('.tab-icon');

    // Create icon element if it doesn't exist
    if (!iconEl) {
      iconEl = document.createElement('span');
      iconEl.className = 'tab-icon';
      const titleEl = activeTabEl.querySelector('.tab-title');
      if (titleEl) {
        activeTabEl.insertBefore(iconEl, titleEl);
      }
    }

    iconEl.innerHTML = getTabIconHtml(icon);
  }
}

/**
 * Get the active tab ID (for external use)
 */
export function getActiveTabId() {
  return TabState.getActiveTabId();
}

// ========================================
// Default Export
// ========================================

export default {
  initTabs,
  setCallbacks,
  updateActiveTabTitle,
  updateActiveTabIcon,
  getActiveTabId
};

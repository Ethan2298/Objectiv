// ========================================
// Header Tabs - Basic tab management
// ========================================

let nextTabId = 4; // Starting after the 3 initial tabs

/**
 * Initialize tab functionality
 */
export function initTabs() {
  const tabsContainer = document.querySelector('.header-tabs');
  if (!tabsContainer) return;

  // Delegate click events
  tabsContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.header-tab');
    const closeBtn = e.target.closest('.tab-close');
    const addBtn = e.target.closest('.tab-add');

    if (closeBtn && tab) {
      e.stopPropagation();
      closeTab(tab);
    } else if (addBtn) {
      createTab();
    } else if (tab) {
      selectTab(tab);
    }
  });
}

/**
 * Select a tab
 */
function selectTab(tab) {
  const tabs = document.querySelectorAll('.header-tab');
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
}

/**
 * Close a tab
 */
function closeTab(tab) {
  const tabs = document.querySelectorAll('.header-tab');

  // Don't close if it's the last tab
  if (tabs.length <= 1) return;

  const wasActive = tab.classList.contains('active');
  const tabIndex = Array.from(tabs).indexOf(tab);

  tab.remove();

  // If closed tab was active, select adjacent tab
  if (wasActive) {
    const remainingTabs = document.querySelectorAll('.header-tab');
    const newIndex = Math.min(tabIndex, remainingTabs.length - 1);
    if (remainingTabs[newIndex]) {
      remainingTabs[newIndex].classList.add('active');
    }
  }
}

/**
 * Create a new tab
 */
function createTab() {
  const tabsContainer = document.querySelector('.header-tabs');
  const addBtn = tabsContainer.querySelector('.tab-add');

  const tab = document.createElement('div');
  tab.className = 'header-tab';
  tab.dataset.tabId = nextTabId++;
  tab.innerHTML = `
    <span class="tab-title">New Tab</span>
    <button class="tab-close" aria-label="Close tab">&times;</button>
  `;

  // Insert before the add button
  tabsContainer.insertBefore(tab, addBtn);

  // Select the new tab
  selectTab(tab);
}

/**
 * Tab Content Manager
 *
 * Manages persistent content containers for each tab.
 * Instead of destroying and recreating content on tab switch,
 * each tab gets its own container that is hidden/shown.
 */

// Container registry: tabId -> { element, viewMode }
const containers = new Map();

let contentBody = null;

/**
 * Initialize the manager (get reference to content-body)
 */
export function init() {
  contentBody = document.getElementById('content-body');
}

/**
 * Get or create a container for a tab
 * @param {string} tabId - The tab ID
 * @returns {HTMLElement} The container element
 */
export function getOrCreateContainer(tabId) {
  if (!contentBody) {
    init();
  }

  let entry = containers.get(tabId);
  if (entry) {
    return entry.element;
  }

  // Create new container
  const container = document.createElement('div');
  container.className = 'tab-container';
  container.id = `tab-content-${tabId}`;
  container.dataset.tabId = tabId;

  contentBody.appendChild(container);

  containers.set(tabId, {
    element: container,
    viewMode: null
  });

  return container;
}

/**
 * Show a specific container (add 'active' class)
 * @param {string} tabId - The tab ID
 */
export function showContainer(tabId) {
  const entry = containers.get(tabId);
  if (entry) {
    entry.element.classList.add('active');
  }
}

/**
 * Hide all containers (remove 'active' class from all)
 */
export function hideAllContainers() {
  for (const entry of containers.values()) {
    entry.element.classList.remove('active');
  }
}

/**
 * Destroy a container (on tab close)
 * @param {string} tabId - The tab ID
 */
export function destroyContainer(tabId) {
  const entry = containers.get(tabId);
  if (entry) {
    entry.element.remove();
    containers.delete(tabId);
  }
}

/**
 * Get the view mode for a container
 * @param {string} tabId - The tab ID
 * @returns {string|null} The view mode or null if not set
 */
export function getContainerViewMode(tabId) {
  const entry = containers.get(tabId);
  return entry ? entry.viewMode : null;
}

/**
 * Set the view mode for a container
 * @param {string} tabId - The tab ID
 * @param {string} mode - The view mode
 */
export function setContainerViewMode(tabId, mode) {
  const entry = containers.get(tabId);
  if (entry) {
    entry.viewMode = mode;
  }
}

/**
 * Check if a container exists for a tab
 * @param {string} tabId - The tab ID
 * @returns {boolean}
 */
export function hasContainer(tabId) {
  return containers.has(tabId);
}

/**
 * Get container element for a tab
 * @param {string} tabId - The tab ID
 * @returns {HTMLElement|null}
 */
export function getContainer(tabId) {
  const entry = containers.get(tabId);
  return entry ? entry.element : null;
}

/**
 * Clear all containers (for reset/cleanup)
 */
export function clearAll() {
  for (const entry of containers.values()) {
    entry.element.remove();
  }
  containers.clear();
}

/**
 * Get the webview element for the active tab
 * @param {string} tabId - The tab ID
 * @returns {HTMLElement|null} The webview element or null
 */
export function getWebview(tabId) {
  const entry = containers.get(tabId);
  if (!entry) return null;
  return entry.element.querySelector('.web-browser-frame');
}

export default {
  init,
  getOrCreateContainer,
  showContainer,
  hideAllContainers,
  destroyContainer,
  getContainerViewMode,
  setContainerViewMode,
  hasContainer,
  getContainer,
  clearAll,
  getWebview
};

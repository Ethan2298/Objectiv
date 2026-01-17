/**
 * Bookmark Storage Module
 *
 * localStorage-based bookmark persistence.
 * Stores web page bookmarks that appear in the side list.
 */

const STORAGE_KEY = 'objectiv_bookmarks';

// ========================================
// Factory Functions
// ========================================

/**
 * Create a new bookmark object
 */
export function createBookmark(url, title, faviconUrl = null, folderId = null, orderIndex = 0) {
  return {
    id: generateId(),
    url,
    title: title || url,
    faviconUrl,
    folderId,
    orderIndex,
    createdAt: new Date().toISOString()
  };
}

/**
 * Generate a unique ID for bookmarks
 */
function generateId() {
  return 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ========================================
// Storage Operations
// ========================================

/**
 * Load all bookmarks from localStorage
 */
export function loadAllBookmarks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const bookmarks = JSON.parse(stored);
    return Array.isArray(bookmarks) ? bookmarks : [];
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    return [];
  }
}

/**
 * Save all bookmarks to localStorage
 */
function saveAllBookmarks(bookmarks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

/**
 * Add a bookmark
 */
export function addBookmark(bookmark) {
  const bookmarks = loadAllBookmarks();
  bookmarks.push(bookmark);
  saveAllBookmarks(bookmarks);
  console.log('Added bookmark:', bookmark.id, bookmark.url);
  return bookmark;
}

/**
 * Delete a bookmark by ID
 */
export function deleteBookmark(bookmarkId) {
  const bookmarks = loadAllBookmarks();
  const filtered = bookmarks.filter(b => b.id !== bookmarkId);
  saveAllBookmarks(filtered);
  console.log('Deleted bookmark:', bookmarkId);
}

/**
 * Find a bookmark by URL
 */
export function findBookmarkByUrl(url) {
  const bookmarks = loadAllBookmarks();
  return bookmarks.find(b => b.url === url) || null;
}

/**
 * Update a bookmark's order and optionally folder
 */
export function updateBookmarkOrder(bookmarkId, orderIndex, folderId = undefined) {
  const bookmarks = loadAllBookmarks();
  const bookmark = bookmarks.find(b => b.id === bookmarkId);

  if (bookmark) {
    bookmark.orderIndex = orderIndex;
    if (folderId !== undefined) {
      bookmark.folderId = folderId;
    }
    saveAllBookmarks(bookmarks);
    console.log('Updated bookmark order:', bookmarkId, 'to index', orderIndex);
  }
}

/**
 * Update a bookmark's properties
 */
export function updateBookmark(bookmarkId, updates) {
  const bookmarks = loadAllBookmarks();
  const bookmark = bookmarks.find(b => b.id === bookmarkId);

  if (bookmark) {
    Object.assign(bookmark, updates);
    saveAllBookmarks(bookmarks);
    console.log('Updated bookmark:', bookmarkId);
  }

  return bookmark;
}

// ========================================
// Default Export
// ========================================

export default {
  createBookmark,
  loadAllBookmarks,
  addBookmark,
  deleteBookmark,
  findBookmarkByUrl,
  updateBookmarkOrder,
  updateBookmark
};

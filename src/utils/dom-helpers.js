/**
 * DOM Helpers Module
 *
 * Utility functions for DOM manipulation, scrolling, and caret positioning.
 */

// ========================================
// Scroll Animation
// ========================================

/**
 * Animate scroll to a target position with easing
 * @param {HTMLElement} container - The scrollable container
 * @param {number} targetScroll - Target scroll position
 * @param {number} duration - Animation duration in ms
 * @param {Function} onComplete - Callback when animation completes
 */
export function animateScroll(container, targetScroll, duration = 200, onComplete = null) {
  const startScroll = container.scrollTop;
  const distance = targetScroll - startScroll;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = startScroll + distance * eased;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Scroll item to snap position (30vh from top)
 * @param {HTMLElement} container - The scrollable container
 * @param {HTMLElement} item - The item to scroll to
 * @param {number} duration - Animation duration in ms
 * @param {Function} onComplete - Callback when animation completes
 */
export function scrollToSnapPosition(container, item, duration = 200, onComplete = null) {
  if (!container || !item) {
    if (onComplete) onComplete();
    return;
  }

  const snapOffset = window.innerHeight * 0.30;
  const targetScroll = item.offsetTop - snapOffset + container.offsetTop;

  animateScroll(container, targetScroll, duration, onComplete);
}

/**
 * Scroll selected item into view (simple version)
 */
export function scrollToSelected() {
  const container = document.getElementById('side-list-items');
  const selectedEl = container?.querySelector('.side-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'start' });
  }
}

// ========================================
// Caret Positioning
// ========================================

/**
 * Place caret at the end of a contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 */
export function placeCaretAtEnd(element) {
  if (!element) return;

  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Place caret at a specific position in a contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 * @param {number} position - Character position (0-indexed)
 */
export function placeCaretAtPosition(element, position) {
  if (!element) return;

  element.focus();
  const range = document.createRange();
  const selection = window.getSelection();

  // Get text node
  const textNode = element.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const safePosition = Math.min(position, textNode.length);
    range.setStart(textNode, safePosition);
    range.collapse(true);
  } else {
    range.selectNodeContents(element);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

// ========================================
// Textarea Auto-Resize
// ========================================

/**
 * Auto-resize textarea to fit content
 * @param {HTMLTextAreaElement} textarea - The textarea element
 */
export function autoResizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

// ========================================
// Element Queries
// ========================================

/**
 * Find the closest scrollable parent
 * @param {HTMLElement} element - Starting element
 * @returns {HTMLElement|null}
 */
export function findScrollableParent(element) {
  if (!element) return null;

  let current = element.parentElement;
  while (current) {
    const overflow = getComputedStyle(current).overflow;
    if (overflow === 'auto' || overflow === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - The element to check
 * @returns {boolean}
 */
export function isInViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

// ========================================
// Focus Management
// ========================================

/**
 * Focus an element and optionally place caret at end
 * @param {HTMLElement} element - Element to focus
 * @param {boolean} caretAtEnd - Whether to place caret at end (for contenteditable)
 */
export function focusElement(element, caretAtEnd = true) {
  if (!element) return;

  element.focus();

  if (caretAtEnd && element.hasAttribute('contenteditable')) {
    placeCaretAtEnd(element);
  }
}

/**
 * Check if an element is editable (input, textarea, or contenteditable)
 * @param {HTMLElement} element - The element to check
 * @returns {boolean}
 */
export function isEditableElement(element) {
  if (!element) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    element.contentEditable === 'true'
  );
}

// ========================================
// Default Export
// ========================================

export default {
  // Scroll
  animateScroll,
  scrollToSnapPosition,
  scrollToSelected,

  // Caret
  placeCaretAtEnd,
  placeCaretAtPosition,

  // Textarea
  autoResizeTextarea,

  // Queries
  findScrollableParent,
  isInViewport,

  // Focus
  focusElement,
  isEditableElement
};

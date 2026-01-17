/**
 * Utility Functions Module
 */

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format duration in seconds to human-readable format
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "15m", "1h 5m")
 */
export function formatDuration(totalSeconds) {
  if (totalSeconds < 60) return '<1m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Format seconds to H:MM:SS timer display
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted timer (e.g., "0:05:30")
 */
export function formatTimerDisplay(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format timestamp for display
 * Shows: "Jan 9 2:34pm" (current year) or "Jan 9 2025 2:34pm" (other years)
 */
export function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = months[date.getMonth()];
  const day = date.getDate();

  // Format time as 12-hour with am/pm
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timeStr = minutes === 0
    ? `${hours}${ampm}`
    : `${hours}:${minutes.toString().padStart(2, '0')}${ampm}`;

  // Include year only if different from current year
  if (date.getFullYear() !== now.getFullYear()) {
    return `${month} ${day} ${date.getFullYear()} ${timeStr}`;
  }
  return `${month} ${day} ${timeStr}`;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Type text animation with optional skip check
 */
export function typeText(element, text, speed, cursorEl = null, isSkipped = () => false) {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      if (isSkipped()) {
        clearInterval(interval);
        resolve();
        return;
      }
      if (i <= text.length) {
        if (cursorEl) {
          element.textContent = text.slice(0, i);
          element.appendChild(cursorEl);
        } else {
          element.textContent = text.slice(0, i);
        }
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Delay helper for async/await
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  generateId,
  formatDuration,
  formatTimerDisplay,
  formatTimestamp,
  capitalize,
  typeText,
  escapeHtml,
  delay
};

/**
 * Platform Module
 *
 * Platform detection, PIN protection, theme toggle, and status reporter.
 */

import AppState from '../state/app-state.js';

// ========================================
// Platform Detection
// ========================================

export const isElectron = !!(window.electronAPI);
export const isBrowser = !isElectron;

// ========================================
// PIN Protection
// ========================================

const APP_PIN = '2298';
const PIN_AUTH_KEY = 'objectiv-authenticated';

export function initPinProtection() {
  const pinModal = document.getElementById('pin-modal');
  const pinInput = document.getElementById('pin-input');
  const pinError = document.getElementById('pin-error');

  if (!pinModal || !pinInput) return;

  // Check if already authenticated
  if (localStorage.getItem(PIN_AUTH_KEY) === 'true') {
    pinModal.style.display = 'none';
    return;
  }

  // Show modal and focus input
  pinModal.style.display = 'flex';
  setTimeout(() => pinInput.focus(), 100);

  // Handle PIN input
  pinInput.addEventListener('input', () => {
    if (pinError) pinError.style.display = 'none';
    if (pinInput.value.length === 4) {
      if (pinInput.value === APP_PIN) {
        localStorage.setItem(PIN_AUTH_KEY, 'true');
        pinModal.style.display = 'none';
      } else {
        if (pinError) pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
      }
    }
  });

  // Handle Enter key
  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && pinInput.value.length === 4) {
      if (pinInput.value === APP_PIN) {
        localStorage.setItem(PIN_AUTH_KEY, 'true');
        pinModal.style.display = 'none';
      } else {
        if (pinError) pinError.style.display = 'block';
        pinInput.value = '';
      }
    }
  });
}

// ========================================
// Theme Toggle
// ========================================

export function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const stored = localStorage.getItem('objectiv-theme');
  if (stored === 'light') {
    document.body.classList.add('light-mode');
    toggle.textContent = '\u263E'; // Moon symbol
  }

  toggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    toggle.textContent = isLight ? '\u263E' : '\u2600'; // Moon or Sun
    localStorage.setItem('objectiv-theme', isLight ? 'light' : 'dark');
  });
}

// ========================================
// Status Reporter
// ========================================

export function updateStatusReporter() {
  const container = document.getElementById('status-items');
  if (!container) return;

  const systemStatus = AppState.getSystemStatus();

  // Get Supabase storage status
  const storageStatus = window.Objectiv?.Repository?.getStorageStatus?.() || { isReady: false };
  const storageLabel = storageStatus.isReady ? 'connected' : 'not configured';
  const storageSt = storageStatus.isReady ? 'ok' : 'warn';

  const items = [
    { label: 'Platform', value: 'web', status: 'ok' },
    { label: 'Supabase', value: storageLabel, status: storageSt },
    { label: 'Taglines', value: systemStatus.taglines ? 'loaded' : 'fallback', status: systemStatus.taglines ? 'ok' : 'warn' }
  ];

  container.innerHTML = items.map(item =>
    `<div class="status-item"><span>${item.label}</span><span class="status-${item.status}">${item.value}</span></div>`
  ).join('');

  if (systemStatus.errors.length > 0) {
    container.innerHTML += `<div style="margin-top:8px;color:#ff5555;font-size:10px;">Errors: ${systemStatus.errors.length}</div>`;
    systemStatus.errors.slice(-3).forEach(err => {
      container.innerHTML += `<div style="color:#ff5555;font-size:9px;word-break:break-all;">${err}</div>`;
    });
  }
}

export function toggleStatusReporter() {
  const reporter = document.getElementById('status-reporter');
  if (reporter) {
    reporter.classList.toggle('visible');
    updateStatusReporter();
  }
}

export function initStatusReporter() {
  // Status toggle button
  document.getElementById('status-toggle')?.addEventListener('click', toggleStatusReporter);
  document.getElementById('status-close')?.addEventListener('click', toggleStatusReporter);

  // Keyboard shortcut 'i' for inspect
  document.addEventListener('keydown', (e) => {
    if (e.key === 'i' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.contentEditable === 'true') return;
      e.preventDefault();
      toggleStatusReporter();
    }
  });
}

// ========================================
// Window Controls (Electron)
// ========================================

export function initWindowControls() {
  if (!window.electronAPI) return;

  document.getElementById('btn-minimize')?.addEventListener('click', () => window.electronAPI.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.electronAPI.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.electronAPI.close());
}

// ========================================
// Browser Zoom Prevention
// ========================================

export function initZoomPrevention() {
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  });
}

// ========================================
// LocalStorage Test
// ========================================

export function testLocalStorage() {
  try {
    localStorage.setItem('_test', '1');
    localStorage.removeItem('_test');
    AppState.updateSystemStatus('localStorage', true);
    return true;
  } catch (e) {
    AppState.reportError('Storage', e);
    return false;
  }
}

// ========================================
// Initialize Platform Module
// ========================================

export function init() {
  // Apply browser mode class
  if (isBrowser) {
    document.body.classList.add('browser-mode');
  }

  // Update system status
  AppState.updateSystemStatus('platform', isBrowser ? 'browser' : 'electron');
  AppState.updateSystemStatus('clarityAPI', isElectron && !!window.electronAPI?.calculateClarity);

  // Test localStorage
  testLocalStorage();

  // Initialize features
  initPinProtection();
  initThemeToggle();
  initStatusReporter();
  initWindowControls();
  initZoomPrevention();
}

// ========================================
// Default Export
// ========================================

export default {
  isElectron,
  isBrowser,
  initPinProtection,
  initThemeToggle,
  updateStatusReporter,
  toggleStatusReporter,
  initStatusReporter,
  initWindowControls,
  initZoomPrevention,
  testLocalStorage,
  init
};

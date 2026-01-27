/**
 * Agent Panel Module
 *
 * Right-side agent chat panel with toggle and resize functionality.
 * Supports two modes:
 * - Agent: Uses backend Claude Agent SDK with tools
 * - Ask: Direct Anthropic API for simple Q&A
 */

import * as AnthropicService from '../services/anthropic-service.js';
import * as ChatContext from '../services/chat-context.js';
import * as smd from '../vendor/smd.js';

// ========================================
// Constants
// ========================================

const PANEL_COLLAPSED_KEY = 'layer-agent-panel-collapsed';
const PANEL_WIDTH_KEY = 'layer-agent-panel-width';
const PANEL_MODE_KEY = 'layer-agent-panel-mode';
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

const AGENT_API_URL = 'http://localhost:3001/api/agent';

const MODES = {
  AGENT: 'Agent',
  ASK: 'Ask'
};

const MODE_ICONS = {
  Agent: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  Ask: `<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`
};

// ========================================
// Panel State
// ========================================

let isResizing = false;
let isHoverExpanded = false; // Track if expanded via hover
let currentMode = MODES.AGENT;
let messages = [];
let isStreaming = false;
let currentAbortController = null;
let currentParser = null;

// ========================================
// Panel Toggle
// ========================================

/**
 * Initialize panel toggle functionality
 */
export function initPanelToggle() {
  const toggleBtn = document.getElementById('agent-panel-toggle');
  const app = document.getElementById('app');

  if (!app) return;

  // Load saved state
  const isCollapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) !== 'false';
  if (isCollapsed) {
    app.classList.add('agent-panel-collapsed');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggle);
  }
}

/**
 * Toggle panel visibility
 */
export function toggle() {
  const app = document.getElementById('app');
  if (!app) return;

  app.classList.toggle('agent-panel-collapsed');
  const collapsed = app.classList.contains('agent-panel-collapsed');
  localStorage.setItem(PANEL_COLLAPSED_KEY, collapsed);

  // Update toggle button icon
  updateToggleIcon(collapsed);
}

/**
 * Update the toggle button icon based on state
 */
function updateToggleIcon(collapsed) {
  const toggleBtn = document.getElementById('agent-panel-toggle');
  if (!toggleBtn) return;

  const svg = toggleBtn.querySelector('svg');
  if (svg) {
    // Panel icon - show opposite state (collapsed = show open icon)
    svg.innerHTML = collapsed
      ? '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line>'
      : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line>';
  }
}

/**
 * Check if panel is collapsed
 * @returns {boolean}
 */
export function isCollapsed() {
  const app = document.getElementById('app');
  return app?.classList.contains('agent-panel-collapsed') || false;
}

/**
 * Open the panel
 */
export function open() {
  const app = document.getElementById('app');
  if (!app) return;

  app.classList.remove('agent-panel-collapsed');
  localStorage.setItem(PANEL_COLLAPSED_KEY, false);
  updateToggleIcon(false);
}

/**
 * Close the panel
 */
export function close() {
  const app = document.getElementById('app');
  if (!app) return;

  app.classList.add('agent-panel-collapsed');
  localStorage.setItem(PANEL_COLLAPSED_KEY, true);
  updateToggleIcon(true);
}

// ========================================
// Panel Hover Expand
// ========================================

/**
 * Initialize hover-to-expand when panel is collapsed
 */
export function initPanelHover() {
  const app = document.getElementById('app');
  const agentPanel = document.getElementById('agent-panel');

  if (!app || !agentPanel) return;

  // Create hover trigger zone
  const trigger = document.createElement('div');
  trigger.id = 'agent-panel-hover-trigger';
  app.appendChild(trigger);

  // Expand on trigger hover
  trigger.addEventListener('mouseenter', () => {
    if (app.classList.contains('agent-panel-collapsed')) {
      isHoverExpanded = true;
      app.classList.remove('agent-panel-collapsed');
    }
  });

  // Collapse when leaving panel (if hover-expanded)
  agentPanel.addEventListener('mouseleave', () => {
    if (isHoverExpanded) {
      isHoverExpanded = false;
      app.classList.add('agent-panel-collapsed');
    }
  });
}

// ========================================
// Panel Resize
// ========================================

/**
 * Initialize panel resize functionality
 */
export function initPanelResize() {
  const handle = document.getElementById('agent-panel-resize-handle');
  const app = document.getElementById('app');

  if (!handle || !app) return;

  // Load saved width
  const savedWidth = localStorage.getItem(PANEL_WIDTH_KEY);
  if (savedWidth) {
    app.style.setProperty('--agent-panel-width', savedWidth + 'px');
  } else {
    app.style.setProperty('--agent-panel-width', DEFAULT_WIDTH + 'px');
  }

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    handle.classList.add('dragging');
    document.body.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    // Calculate width from right edge
    const newWidth = window.innerWidth - e.clientX;
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    app.style.setProperty('--agent-panel-width', clamped + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      handle.classList.remove('dragging');
      document.body.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save width
      const width = getComputedStyle(app).getPropertyValue('--agent-panel-width');
      localStorage.setItem(PANEL_WIDTH_KEY, parseInt(width));
    }
  });
}

/**
 * Set panel width
 * @param {number} width - Width in pixels
 */
export function setWidth(width) {
  const app = document.getElementById('app');
  if (!app) return;

  const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
  app.style.setProperty('--agent-panel-width', clampedWidth + 'px');
  localStorage.setItem(PANEL_WIDTH_KEY, clampedWidth);
}

/**
 * Get current panel width
 * @returns {number} Width in pixels
 */
export function getWidth() {
  const app = document.getElementById('app');
  if (!app) return DEFAULT_WIDTH;

  const width = getComputedStyle(app).getPropertyValue('--agent-panel-width');
  return parseInt(width) || DEFAULT_WIDTH;
}

// ========================================
// Mode Selector
// ========================================

/**
 * Initialize the mode selector pill
 */
export function initModeSelector() {
  const pill = document.getElementById('agent-input-pill');
  const label = document.getElementById('agent-mode-label');
  const icon = document.getElementById('agent-mode-icon');

  if (!pill || !label) return;

  // Load saved mode
  const savedMode = localStorage.getItem(PANEL_MODE_KEY);
  if (savedMode && Object.values(MODES).includes(savedMode)) {
    currentMode = savedMode;
  }
  label.textContent = currentMode;

  if (icon && MODE_ICONS[currentMode]) {
    icon.innerHTML = MODE_ICONS[currentMode];
  }

  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = pill.getBoundingClientRect();

    // Use the global ContextMenu
    const ContextMenu = window.Layer?.ContextMenu;
    if (!ContextMenu) {
      console.warn('ContextMenu not available');
      return;
    }

    ContextMenu.showContextMenu({
      x: rect.left,
      y: rect.top - 8,
      items: [
        {
          label: MODES.AGENT,
          icon: MODE_ICONS.Agent,
          action: () => setMode(MODES.AGENT)
        },
        {
          label: MODES.ASK,
          icon: MODE_ICONS.Ask,
          action: () => setMode(MODES.ASK)
        }
      ]
    });
  });
}

/**
 * Set the current mode
 * @param {string} mode
 */
export function setMode(mode) {
  if (!Object.values(MODES).includes(mode)) return;

  currentMode = mode;
  localStorage.setItem(PANEL_MODE_KEY, mode);

  const label = document.getElementById('agent-mode-label');
  if (label) {
    label.textContent = mode;
  }

  const icon = document.getElementById('agent-mode-icon');
  if (icon && MODE_ICONS[mode]) {
    icon.innerHTML = MODE_ICONS[mode];
  }
}

/**
 * Get current mode
 * @returns {string}
 */
export function getMode() {
  return currentMode;
}

// ========================================
// Auto-expand Textarea
// ========================================

/**
 * Initialize auto-expanding textarea
 */
export function initTextarea() {
  const textarea = document.getElementById('agent-input-text');
  if (!textarea) return;

  const adjustHeight = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  textarea.addEventListener('input', adjustHeight);
  adjustHeight();
}

// ========================================
// Chat Functionality
// ========================================

/**
 * Add a message to the chat
 * @param {string} content - Message text
 * @param {'user' | 'assistant'} role - Who sent the message
 */
function addMessage(content, role) {
  const message = {
    id: Date.now(),
    content,
    role,
    timestamp: new Date()
  };
  messages.push(message);
  renderMessage(message);
  scrollToBottom();
}

/**
 * Render a single message to the DOM
 * @param {object} message
 */
function renderMessage(message) {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `chat-message chat-message-${message.role}`;
  el.dataset.messageId = message.id;

  const bubble = document.createElement('div');
  bubble.className = message.role === 'assistant' ? 'chat-bubble chat-bubble-markdown' : 'chat-bubble';

  if (message.role === 'assistant') {
    // Render markdown for assistant messages
    const renderer = smd.default_renderer(bubble);
    const parser = smd.parser(renderer);
    smd.parser_write(parser, message.content);
    smd.parser_end(parser);
  } else {
    bubble.textContent = message.content;
  }

  el.appendChild(bubble);
  container.appendChild(el);
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
  const container = document.getElementById('agent-panel-content');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'chat-message chat-message-assistant';
  el.id = 'typing-indicator';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble typing-bubble';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  el.appendChild(bubble);
  container.appendChild(el);
  scrollToBottom();
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Create an empty streaming bubble for assistant response
 * Initializes the streaming markdown parser
 * @returns {Object} Parser instance
 */
function createStreamingBubble() {
  const container = document.getElementById('agent-panel-content');
  if (!container) return null;

  const el = document.createElement('div');
  el.className = 'chat-message chat-message-assistant';
  el.id = 'streaming-message';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-markdown';
  bubble.id = 'streaming-bubble';

  el.appendChild(bubble);
  container.appendChild(el);
  scrollToBottom();

  // Initialize streaming markdown parser
  const renderer = smd.default_renderer(bubble);
  currentParser = smd.parser(renderer);

  return currentParser;
}

/**
 * Write a chunk to the streaming markdown parser
 * @param {string} chunk - New chunk of text
 */
function writeStreamingChunk(chunk) {
  if (currentParser) {
    smd.parser_write(currentParser, chunk);
    scrollToBottom();
  }
}

/**
 * Finalize streaming bubble (end parser and clean up)
 * @param {string} content - Final content for context
 */
function finalizeStreamingBubble(content) {
  // End the parser to flush any remaining content
  if (currentParser) {
    smd.parser_end(currentParser);
    currentParser = null;
  }

  const el = document.getElementById('streaming-message');
  const bubble = document.getElementById('streaming-bubble');

  if (el) {
    el.removeAttribute('id');
    el.dataset.messageId = Date.now();
  }

  if (bubble) {
    bubble.removeAttribute('id');
  }

  // Add to messages array
  messages.push({
    id: Date.now(),
    content,
    role: 'assistant',
    timestamp: new Date()
  });

  // Add to conversation context
  ChatContext.addMessage('assistant', content);
}

/**
 * Handle API errors
 * @param {Error} error
 */
function handleApiError(error) {
  removeTypingIndicator();
  const streamingEl = document.getElementById('streaming-message');
  if (streamingEl) streamingEl.remove();

  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'chat-message chat-message-assistant';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-error';

  let errorMessage = 'Something went wrong. Please try again.';

  if (error.message === 'NO_API_KEY') {
    errorMessage = 'No API key configured. Run: doppler run -- npm run web';
  } else if (error.status === 401) {
    errorMessage = 'Invalid API key. Check your Doppler configuration.';
  } else if (error.status === 429) {
    errorMessage = 'Rate limited. Please wait a moment and try again.';
  } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    errorMessage = 'Network error. Please check your connection.';
  } else if (error.message) {
    errorMessage = error.message;
  }

  bubble.innerHTML = errorMessage;
  el.appendChild(bubble);
  container.appendChild(el);
  scrollToBottom();

  isStreaming = false;
}

/**
 * Cancel ongoing stream
 */
export function cancelStream() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (currentParser) {
    smd.parser_end(currentParser);
    currentParser = null;
  }
  isStreaming = false;
}

/**
 * Handle sending a message
 */
async function sendMessage() {
  const textarea = document.getElementById('agent-input-text');
  if (!textarea) return;

  const content = textarea.value.trim();
  if (!content) return;

  // Don't allow sending while streaming
  if (isStreaming) return;

  // Add user message to UI
  addMessage(content, 'user');

  // Add to conversation context
  ChatContext.addMessage('user', content);

  // Clear input
  textarea.value = '';
  textarea.style.height = 'auto';

  // Route to appropriate handler based on mode
  if (currentMode === MODES.AGENT) {
    await sendAgentMessage(content);
  } else {
    await sendAskMessage(content);
  }
}

/**
 * Send message using backend Agent SDK (Agent mode)
 */
async function sendAgentMessage(content) {
  // Show typing indicator
  showTypingIndicator();
  isStreaming = true;

  // Create abort controller for cancellation
  currentAbortController = new AbortController();

  try {
    const response = await fetch(AGENT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: content,
        conversationHistory: ChatContext.getConversationHistory().slice(0, -1)
      }),
      signal: currentAbortController.signal
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let streamingBubble = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (!data.trim()) continue;

          try {
            const event = JSON.parse(data);
            handleAgentEvent(event, {
              onText: (text) => {
                removeTypingIndicator();
                if (!streamingBubble) {
                  streamingBubble = createStreamingBubble();
                }
                writeStreamingChunk(text);
                fullText += text;
              },
              onToolUse: (toolUse) => {
                showToolUseIndicator(toolUse);
              },
              onToolResult: (toolResult) => {
                handleToolResult(toolResult);
              },
              onDone: () => {
                removeTypingIndicator();
                removeToolIndicators();
                isStreaming = false;
                currentAbortController = null;
                if (fullText) {
                  finalizeStreamingBubble(fullText);
                }
              },
              onError: (errorMsg) => {
                handleApiError(new Error(errorMsg));
              }
            });
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    handleApiError(error);
    currentAbortController = null;
  }
}

/**
 * Handle an event from the agent backend
 */
function handleAgentEvent(event, callbacks) {
  switch (event.type) {
    case 'text_delta':
      // Streaming text chunk from direct API
      if (event.text) {
        callbacks.onText(event.text);
      }
      break;

    case 'tool_use':
      // Tool being invoked
      if (event.tool) {
        callbacks.onToolUse(event.tool);
      }
      break;

    case 'tool_result':
      callbacks.onToolResult(event);
      break;

    case 'done':
      callbacks.onDone();
      break;

    case 'error':
      callbacks.onError(event.message);
      break;
  }
}

/**
 * Show tool use indicator in chat
 */
function showToolUseIndicator(toolUse) {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  // Remove existing tool indicator if any
  const existing = container.querySelector('.tool-indicator');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'tool-indicator';

  // Format tool name nicely (replace underscores with spaces)
  const toolName = toolUse.name.replace(/_/g, ' ');
  el.innerHTML = `
    <span class="tool-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </span>
    <span class="tool-name">${toolName}</span>
    <span class="tool-spinner"></span>
  `;

  container.appendChild(el);
  scrollToBottom();
}

/**
 * Handle tool result - check for actions
 */
function handleToolResult(event) {
  if (!event.result) return;

  // Check if result is an action to execute
  try {
    const result = JSON.parse(event.result);
    if (result.action) {
      executeAction(result);
    }
  } catch {
    // Not JSON or not an action, ignore
  }
}

/**
 * Execute a frontend action from tool result
 */
function executeAction(action) {
  const Tabs = window.Layer?.Tabs;

  switch (action.action) {
    case 'open_note_tab':
      if (Tabs) {
        // Create a new tab for the note
        const tabId = Tabs.createNewTab(action.noteName || 'Note', 'objective');
        // Navigate to the note
        const NavigationController = window.Layer?.NavigationController;
        if (NavigationController) {
          NavigationController.navigateToNote(action.noteId);
        }
      }
      break;

    case 'open_url_tab':
      // Open URL in a new browser tab
      window.open(action.url, '_blank');
      break;
  }
}

/**
 * Remove tool indicators
 */
function removeToolIndicators() {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const indicators = container.querySelectorAll('.tool-indicator');
  indicators.forEach(el => el.remove());
}

/**
 * Send message using direct Anthropic API (Ask mode)
 */
async function sendAskMessage(content) {
  // Check for API key first
  if (!AnthropicService.hasApiKey()) {
    handleApiError(new Error('NO_API_KEY'));
    return;
  }

  // Show typing indicator
  showTypingIndicator();
  isStreaming = true;

  // Create abort controller for cancellation
  currentAbortController = new AbortController();

  // Create streaming bubble
  let streamingBubble = null;

  await AnthropicService.sendMessage({
    message: content,
    mode: currentMode,
    conversationHistory: ChatContext.getConversationHistory().slice(0, -1),
    signal: currentAbortController.signal,

    onChunk: (chunk, fullText) => {
      removeTypingIndicator();
      if (!streamingBubble) {
        streamingBubble = createStreamingBubble();
      }
      writeStreamingChunk(chunk);
    },

    onComplete: (fullText) => {
      removeTypingIndicator();
      isStreaming = false;
      currentAbortController = null;
      if (fullText) {
        finalizeStreamingBubble(fullText);
      }
    },

    onError: (error) => {
      handleApiError(error);
      currentAbortController = null;
    }
  });
}

/**
 * Initialize chat input handlers
 */
function initChatInput() {
  const textarea = document.getElementById('agent-input-text');
  const sendBtn = document.getElementById('agent-send-btn');

  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      // Send on Enter (without shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
}

/**
 * Clear all messages
 */
export function clearMessages() {
  // Cancel any ongoing stream
  cancelStream();

  messages = [];
  ChatContext.clearHistory();

  const container = document.getElementById('agent-panel-content');
  if (container) {
    container.innerHTML = '';
  }
}

// ========================================
// Initialize
// ========================================

export function init() {
  initPanelToggle();
  initPanelResize();
  initPanelHover();
  initModeSelector();
  initTextarea();
  initChatInput();

  // Set initial toggle icon state
  const collapsed = localStorage.getItem(PANEL_COLLAPSED_KEY) !== 'false';
  updateToggleIcon(collapsed);
}

// ========================================
// Default Export
// ========================================

export default {
  init,
  initPanelToggle,
  initPanelResize,
  initPanelHover,
  initModeSelector,
  toggle,
  isCollapsed,
  open,
  close,
  setWidth,
  getWidth,
  setMode,
  getMode,
  clearMessages,
  cancelStream
};

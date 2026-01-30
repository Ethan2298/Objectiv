/**
 * Chat Window - Standalone Entry Point
 *
 * Runs in a popped-out browser window created by agent-panel.js tearOffTab().
 * Reads initial state from localStorage transfer key, renders messages,
 * and provides independent multi-tab chat capability matching the main panel.
 */

import * as AnthropicService from '../services/anthropic-service.js';
import * as ChatContext from '../services/chat-context.js';
import * as Repository from '../data/repository.js';
import { loadAllFolders } from '../data/folder-storage.js';
import { loadAllNotes } from '../data/note-storage.js';
import * as smd from '../vendor/smd.js';

// ========================================
// Constants
// ========================================

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
// Tab State
// ========================================

let chatTabs = [];
let activeTabId = null;
let nextTabId = 1;
let currentMode = MODES.AGENT;
let messages = []; // active tab's messages in memory

// Context search menu reference
let contextMenuEl = null;

// BroadcastChannel for active-tab sync from main window
let selectionChannel = null;

// Per-tab streaming state: tabId -> { abortController, parser, isStreaming, accumulatedText }
const tabStreamState = new Map();

function getTabStream(tabId) {
  if (!tabStreamState.has(tabId)) {
    tabStreamState.set(tabId, {
      abortController: null,
      parser: null,
      isStreaming: false,
      accumulatedText: ''
    });
  }
  return tabStreamState.get(tabId);
}

function cleanupTabStream(tabId) {
  const state = tabStreamState.get(tabId);
  if (state) {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
    if (state.parser) {
      try { smd.parser_end(state.parser); } catch { /* ignore */ }
      state.parser = null;
    }
    state.isStreaming = false;
    state.accumulatedText = '';
  }
  tabStreamState.delete(tabId);
}

// ========================================
// Initialization
// ========================================

function init() {
  applyTheme();

  // Read transfer key from window.name
  const transferKey = window.name;
  if (!transferKey) {
    console.error('No transfer key provided');
    return;
  }

  const rawData = localStorage.getItem(transferKey);
  if (!rawData) {
    console.error('No transfer data found for key:', transferKey);
    return;
  }

  localStorage.removeItem(transferKey);

  let tabData;
  try {
    tabData = JSON.parse(rawData);
  } catch (e) {
    console.error('Failed to parse transfer data:', e);
    return;
  }

  // Create initial tab from transferred data
  const tab = {
    id: nextTabId++,
    title: tabData.title || 'Chat',
    messages: tabData.messages || [],
    mode: tabData.mode || MODES.AGENT,
    selectedContext: tabData.selectedContext || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  chatTabs.push(tab);
  activeTabId = tab.id;
  currentMode = tab.mode;
  messages = [...tab.messages];

  document.title = tab.title;

  updateModeUI();
  renderChatTabs();
  renderAllMessages();

  // Rebuild conversation context
  for (const msg of messages) {
    ChatContext.addMessage(msg.role, msg.content);
  }

  initInput();
  initModeSelector();
  initTextarea();
  initTabEventListeners();
  initThemeSync();
  initContextSearch();
  initBroadcastChannel();

  // Initialize data repository for @ search, then render transferred chips
  Repository.initializeData().then(() => {
    renderContextChips();
  }).catch(() => {
    // Still render chips even if repository fails to load
    renderContextChips();
  });

  window.addEventListener('beforeunload', cleanup);
}

// ========================================
// Chat Tabs
// ========================================

function createChatTab(title = 'New Chat') {
  const tab = {
    id: nextTabId++,
    title,
    messages: [],
    mode: currentMode,
    selectedContext: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  chatTabs.push(tab);
  switchToTab(tab.id);
  renderChatTabs();
  return tab.id;
}

function switchToTab(tabId) {
  const tab = chatTabs.find(t => t.id === tabId);
  if (!tab) return;

  // If current tab is streaming, detach parser but keep stream running
  const prevStream = activeTabId ? getTabStream(activeTabId) : null;
  if (prevStream && prevStream.isStreaming && prevStream.parser) {
    try { smd.parser_end(prevStream.parser); } catch { /* ignore */ }
    prevStream.parser = null;
  }

  // Save current tab's messages
  if (activeTabId) saveCurrentTabMessages();

  activeTabId = tabId;
  messages = [...tab.messages];

  // Load messages into UI
  loadTabMessages(tabId);

  // Re-attach if target tab is streaming in background
  const targetStream = getTabStream(tabId);
  if (targetStream.isStreaming) {
    reattachStreamingBubble(targetStream);
  }

  // Restore per-tab mode
  currentMode = tab.mode || MODES.AGENT;
  updateModeUI();
  document.title = tab.title;

  renderChatTabs();
  renderContextChips();
}

function closeChatTab(tabId) {
  const index = chatTabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  cleanupTabStream(tabId);

  if (chatTabs.length === 1) {
    // Clear instead of closing last tab
    clearMessages();
    chatTabs[0].messages = [];
    chatTabs[0].title = 'New Chat';
    document.title = 'New Chat';
    renderChatTabs();
    return;
  }

  chatTabs.splice(index, 1);

  if (activeTabId === tabId) {
    const newIndex = Math.min(index, chatTabs.length - 1);
    switchToTab(chatTabs[newIndex].id);
  } else {
    renderChatTabs();
  }
}

function saveCurrentTabMessages() {
  const tab = chatTabs.find(t => t.id === activeTabId);
  if (!tab) return;

  tab.messages = [...messages];
  tab.updatedAt = Date.now();

  if (tab.title === 'New Chat' && messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      tab.title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
      document.title = tab.title;
    }
  }
}

function loadTabMessages(tabId) {
  const tab = chatTabs.find(t => t.id === tabId);
  if (!tab) return;

  const container = document.getElementById('agent-panel-content');
  if (container) container.innerHTML = '';

  messages = [...tab.messages];
  ChatContext.clearHistory();

  for (const msg of messages) {
    renderMessage(msg);
    ChatContext.addMessage(msg.role, msg.content);
  }
  scrollToBottom();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderChatTabs() {
  const container = document.querySelector('.agent-panel-tabs');
  if (!container) return;

  const addBtn = container.querySelector('.tab-add');
  container.innerHTML = '';

  for (const tab of chatTabs) {
    const tabEl = document.createElement('div');
    tabEl.className = `agent-panel-tab${tab.id === activeTabId ? ' active' : ''}`;
    tabEl.dataset.tabId = tab.id;

    tabEl.innerHTML = `
      <span class="tab-content">
        <span class="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span class="tab-title">${escapeHtml(tab.title)}</span>
        <button class="tab-close" aria-label="Close tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </span>
    `;
    container.appendChild(tabEl);
  }

  if (addBtn) {
    container.appendChild(addBtn);
  } else {
    const newAddBtn = document.createElement('button');
    newAddBtn.className = 'tab-add';
    newAddBtn.setAttribute('aria-label', 'New chat');
    newAddBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
    container.appendChild(newAddBtn);
  }
}

function initTabEventListeners() {
  const container = document.querySelector('.agent-panel-tabs');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tabEl = e.target.closest('.agent-panel-tab');
    if (tabEl && !e.target.closest('.tab-close')) {
      const tabId = parseInt(tabEl.dataset.tabId);
      if (tabId !== activeTabId) switchToTab(tabId);
      return;
    }

    const closeBtn = e.target.closest('.tab-close');
    if (closeBtn) {
      const parentTab = closeBtn.closest('.agent-panel-tab');
      if (parentTab) closeChatTab(parseInt(parentTab.dataset.tabId));
      return;
    }

    const addBtn = e.target.closest('.tab-add');
    if (addBtn) {
      createChatTab();
      return;
    }
  });

  // Double-click to rename
  container.addEventListener('dblclick', (e) => {
    const tabEl = e.target.closest('.agent-panel-tab');
    if (!tabEl) return;

    const tabId = parseInt(tabEl.dataset.tabId);
    const titleEl = tabEl.querySelector('.tab-title');
    if (!titleEl || titleEl.contentEditable === 'true') return;

    e.preventDefault();
    startTabRename(tabId, titleEl);
  });

  // History button
  const historyBtn = document.querySelector('.agent-panel-actions .agent-header-btn[title="History"]');
  if (historyBtn) {
    historyBtn.addEventListener('click', showChatHistory);
  }
}

function startTabRename(tabId, titleEl) {
  const tab = chatTabs.find(t => t.id === tabId);
  if (!tab) return;

  const originalTitle = tab.title;

  titleEl.contentEditable = 'true';
  titleEl.classList.add('editing');
  titleEl.focus();

  const range = document.createRange();
  range.selectNodeContents(titleEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finishRename = (save) => {
    titleEl.contentEditable = 'false';
    titleEl.classList.remove('editing');

    if (save) {
      const newTitle = titleEl.textContent.trim();
      if (newTitle && newTitle !== originalTitle) {
        tab.title = newTitle;
        if (tab.id === activeTabId) document.title = newTitle;
      } else {
        titleEl.textContent = originalTitle;
      }
    } else {
      titleEl.textContent = originalTitle;
    }

    titleEl.removeEventListener('keydown', onKeyDown);
    titleEl.removeEventListener('blur', onBlur);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finishRename(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finishRename(false); }
  };

  const onBlur = () => finishRename(true);

  titleEl.addEventListener('keydown', onKeyDown);
  titleEl.addEventListener('blur', onBlur);
}

function showChatHistory() {
  // Simple dropdown using a temporary menu element (no ContextMenu available in standalone)
  const existing = document.getElementById('chat-history-menu');
  if (existing) { existing.remove(); return; }

  const historyBtn = document.querySelector('.agent-panel-actions .agent-header-btn[title="History"]');
  if (!historyBtn) return;

  const rect = historyBtn.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.id = 'chat-history-menu';
  menu.className = 'chat-history-dropdown';
  menu.style.position = 'fixed';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.zIndex = '9999';

  if (chatTabs.length === 0) {
    const item = document.createElement('div');
    item.className = 'chat-history-item disabled';
    item.textContent = 'No chat history';
    menu.appendChild(item);
  } else {
    for (const tab of chatTabs) {
      const item = document.createElement('div');
      item.className = 'chat-history-item';
      item.textContent = tab.title;
      item.addEventListener('click', () => {
        switchToTab(tab.id);
        menu.remove();
      });
      menu.appendChild(item);
    }
  }

  document.body.appendChild(menu);

  const dismiss = (e) => {
    if (!menu.contains(e.target) && e.target !== historyBtn) {
      menu.remove();
      document.removeEventListener('click', dismiss);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss), 0);
}

// ========================================
// Message Rendering
// ========================================

function renderAllMessages() {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  container.innerHTML = '';
  for (const msg of messages) {
    renderMessage(msg);
  }
  scrollToBottom();
}

function renderMessage(message) {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `chat-message chat-message-${message.role}`;
  el.dataset.messageId = message.id;

  const bubble = document.createElement('div');
  bubble.className = message.role === 'assistant' ? 'chat-bubble chat-bubble-markdown' : 'chat-bubble';

  if (message.role === 'assistant') {
    const renderer = smd.default_renderer(bubble);
    const p = smd.parser(renderer);
    smd.parser_write(p, message.content);
    smd.parser_end(p);
  } else {
    bubble.textContent = message.content;
  }

  el.appendChild(bubble);
  container.appendChild(el);
}

function scrollToBottom() {
  const container = document.getElementById('agent-panel-content');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// ========================================
// Streaming
// ========================================

function createStreamingBubble(tabId) {
  if (tabId !== activeTabId) return null;

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

  const renderer = smd.default_renderer(bubble);
  const stream = getTabStream(tabId);
  stream.parser = smd.parser(renderer);
  return stream.parser;
}

function reattachStreamingBubble(stream) {
  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'chat-message chat-message-assistant';
  el.id = 'streaming-message';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-markdown';
  bubble.id = 'streaming-bubble';

  el.appendChild(bubble);
  container.appendChild(el);

  const renderer = smd.default_renderer(bubble);
  stream.parser = smd.parser(renderer);
  if (stream.accumulatedText) {
    smd.parser_write(stream.parser, stream.accumulatedText);
  }
  scrollToBottom();
}

function writeStreamingChunk(tabId, chunk) {
  const stream = getTabStream(tabId);
  stream.accumulatedText += chunk;

  if (stream.parser && tabId === activeTabId) {
    smd.parser_write(stream.parser, chunk);
    scrollToBottom();
  }
}

function finalizeStreamingBubble(tabId, content) {
  const stream = getTabStream(tabId);

  if (stream.parser) {
    smd.parser_end(stream.parser);
    stream.parser = null;
  }
  stream.isStreaming = false;
  stream.accumulatedText = '';

  if (tabId === activeTabId) {
    const el = document.getElementById('streaming-message');
    const bubble = document.getElementById('streaming-bubble');
    if (el) { el.removeAttribute('id'); el.dataset.messageId = Date.now(); }
    if (bubble) bubble.removeAttribute('id');
  }

  const tab = chatTabs.find(t => t.id === tabId);
  if (tab) {
    const msg = { id: Date.now(), content, role: 'assistant', timestamp: new Date() };
    tab.messages.push(msg);
    tab.updatedAt = Date.now();

    if (tabId === activeTabId) {
      messages.push(msg);
      ChatContext.addMessage('assistant', content);
    }
  }
}

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

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

// ========================================
// Send Message
// ========================================

function addMessage(content, role) {
  const message = { id: Date.now(), content, role, timestamp: new Date() };
  messages.push(message);
  renderMessage(message);
  scrollToBottom();
  saveCurrentTabMessages();
}

async function sendMessage() {
  const textarea = document.getElementById('agent-input-text');
  if (!textarea) return;

  const content = textarea.value.trim();
  if (!content) return;

  const activeStream = getTabStream(activeTabId);
  if (activeStream.isStreaming) return;

  addMessage(content, 'user');

  // Prepend selected context to the message for the AI
  const contextPrefix = serializeContextForPrompt();
  const contentWithContext = contextPrefix + content;

  ChatContext.addMessage('user', contentWithContext);

  textarea.value = '';
  textarea.style.height = 'auto';

  if (currentMode === MODES.AGENT) {
    await sendAgentMessage(contentWithContext);
  } else {
    await sendAskMessage(contentWithContext);
  }
}

async function sendAgentMessage(content) {
  const tabId = activeTabId;
  const stream = getTabStream(tabId);

  showTypingIndicator();
  stream.isStreaming = true;
  stream.accumulatedText = '';
  stream.abortController = new AbortController();

  try {
    const response = await fetch(AGENT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: content,
        conversationHistory: ChatContext.getConversationHistory().slice(0, -1)
      }),
      signal: stream.abortController.signal
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let bubbleCreated = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
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
                if (tabId === activeTabId) removeTypingIndicator();
                if (!bubbleCreated) {
                  createStreamingBubble(tabId);
                  bubbleCreated = true;
                }
                writeStreamingChunk(tabId, text);
                fullText += text;
              },
              onDone: () => {
                if (tabId === activeTabId) removeTypingIndicator();
                stream.abortController = null;
                if (fullText) {
                  finalizeStreamingBubble(tabId, fullText);
                } else {
                  stream.isStreaming = false;
                }
              },
              onError: (errorMsg) => {
                stream.isStreaming = false;
                stream.abortController = null;
                if (tabId === activeTabId) showError(errorMsg);
              }
            });
          } catch { /* ignore parse errors */ }
        }
      }
    }
  } catch (error) {
    stream.isStreaming = false;
    stream.abortController = null;
    if (error.name !== 'AbortError') {
      if (tabId === activeTabId) showError(error.message);
    }
  }
}

function handleAgentEvent(event, callbacks) {
  switch (event.type) {
    case 'text_delta':
      if (event.text) callbacks.onText(event.text);
      break;
    case 'done':
      callbacks.onDone();
      break;
    case 'error':
      callbacks.onError(event.message);
      break;
  }
}

async function sendAskMessage(content) {
  if (!AnthropicService.hasApiKey()) {
    showError('No API key configured. Run: doppler run -- npm run web');
    return;
  }

  const tabId = activeTabId;
  const stream = getTabStream(tabId);

  showTypingIndicator();
  stream.isStreaming = true;
  stream.accumulatedText = '';
  stream.abortController = new AbortController();

  let bubbleCreated = false;

  await AnthropicService.sendMessage({
    message: content,
    mode: currentMode,
    conversationHistory: ChatContext.getConversationHistory().slice(0, -1),
    signal: stream.abortController.signal,

    onChunk: (chunk) => {
      if (tabId === activeTabId) removeTypingIndicator();
      if (!bubbleCreated) {
        createStreamingBubble(tabId);
        bubbleCreated = true;
      }
      writeStreamingChunk(tabId, chunk);
    },

    onComplete: (fullText) => {
      if (tabId === activeTabId) removeTypingIndicator();
      stream.abortController = null;
      if (fullText) {
        finalizeStreamingBubble(tabId, fullText);
      } else {
        stream.isStreaming = false;
      }
    },

    onError: (error) => {
      stream.isStreaming = false;
      stream.abortController = null;
      if (tabId === activeTabId) showError(error.message || 'Something went wrong.');
    }
  });
}

// ========================================
// Error Display
// ========================================

function showError(message) {
  removeTypingIndicator();
  const streamingEl = document.getElementById('streaming-message');
  if (streamingEl) streamingEl.remove();

  const container = document.getElementById('agent-panel-content');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'chat-message chat-message-assistant';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-error';
  bubble.textContent = message;

  el.appendChild(bubble);
  container.appendChild(el);
  scrollToBottom();
}

// ========================================
// Mode Selector
// ========================================

function updateModeUI() {
  const label = document.getElementById('agent-mode-label');
  const icon = document.getElementById('agent-mode-icon');

  if (label) label.textContent = currentMode;
  if (icon && MODE_ICONS[currentMode]) {
    icon.innerHTML = MODE_ICONS[currentMode];
  }
}

function setMode(mode) {
  if (!Object.values(MODES).includes(mode)) return;
  currentMode = mode;

  const tab = chatTabs.find(t => t.id === activeTabId);
  if (tab) tab.mode = mode;

  updateModeUI();
}

function initModeSelector() {
  const pill = document.getElementById('agent-input-pill');
  if (!pill) return;

  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    // Toggle between modes
    setMode(currentMode === MODES.AGENT ? MODES.ASK : MODES.AGENT);
  });
}

// ========================================
// Textarea
// ========================================

function initTextarea() {
  const textarea = document.getElementById('agent-input-text');
  if (!textarea) return;

  const adjustHeight = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  textarea.addEventListener('input', adjustHeight);
  adjustHeight();
}

function initInput() {
  const textarea = document.getElementById('agent-input-text');
  const sendBtn = document.getElementById('agent-send-btn');

  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
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

// ========================================
// Clear Messages
// ========================================

function clearMessages() {
  // Cancel any ongoing stream for active tab
  const stream = getTabStream(activeTabId);
  if (stream.abortController) {
    stream.abortController.abort();
    stream.abortController = null;
  }
  if (stream.parser) {
    try { smd.parser_end(stream.parser); } catch { /* ignore */ }
    stream.parser = null;
  }
  stream.isStreaming = false;
  stream.accumulatedText = '';

  messages = [];
  ChatContext.clearHistory();

  const container = document.getElementById('agent-panel-content');
  if (container) container.innerHTML = '';

  const tab = chatTabs.find(t => t.id === activeTabId);
  if (tab) tab.messages = [];
}

// ========================================
// Theme
// ========================================

function applyTheme() {
  const theme = localStorage.getItem('layer-theme');
  document.body.classList.remove('light-mode', 'solarized-mode');
  if (theme === 'light') {
    document.body.classList.add('light-mode');
  } else if (theme === 'solarized') {
    document.body.classList.add('solarized-mode');
  }
}

function initThemeSync() {
  // When parent changes theme via localStorage, sync it here
  window.addEventListener('storage', (e) => {
    if (e.key === 'layer-theme') {
      applyTheme();
    }
  });
}

// ========================================
// Context Chips
// ========================================

const CHIP_ICONS = {
  Objective: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  Folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  Note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
};

const SELECTION_TYPE_MAP = {
  objective: 'Objective',
  folder: 'Folder',
  note: 'Note'
};

function renderContextChips() {
  const container = document.getElementById('agent-context-chips');
  if (!container) return;

  const tab = chatTabs.find(t => t.id === activeTabId);
  const items = tab?.selectedContext || [];

  container.innerHTML = '';
  if (items.length === 0) return;

  for (const item of items) {
    const chip = document.createElement('span');
    chip.className = 'context-chip';
    const icon = CHIP_ICONS[item.type] || '';
    chip.innerHTML = `
      <svg class="context-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      <span class="context-chip-name">${escapeHtml(item.name)}</span>
      <button class="context-chip-remove" aria-label="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;

    chip.querySelector('.context-chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeContextItem(item.id);
    });

    container.appendChild(chip);
  }
}

function removeContextItem(itemId) {
  const tab = chatTabs.find(t => t.id === activeTabId);
  if (!tab || !tab.selectedContext) return;

  const removed = tab.selectedContext.find(c => c.id === itemId);
  tab.selectedContext = tab.selectedContext.filter(c => c.id !== itemId);

  if (removed && removed.isActiveTab) {
    tab._dismissedActiveTabId = removed.id;
  }

  renderContextChips();
}

function toggleContextItem(item) {
  const tab = chatTabs.find(t => t.id === activeTabId);
  if (!tab) return;

  if (!tab.selectedContext) tab.selectedContext = [];

  const index = tab.selectedContext.findIndex(c => c.id === item.id);
  if (index >= 0) {
    const removed = tab.selectedContext[index];
    if (removed.isActiveTab) tab._dismissedActiveTabId = removed.id;
    tab.selectedContext.splice(index, 1);
  } else {
    tab.selectedContext.push({
      id: item.id,
      type: item.type,
      name: item.name,
      data: item.data
    });
  }

  renderContextChips();
}

function serializeContextForPrompt() {
  const tab = chatTabs.find(t => t.id === activeTabId);
  const items = tab?.selectedContext || [];
  if (items.length === 0) return '';

  const blocks = items.map(item => {
    const lines = [`[${item.type}: ${item.name}]`];
    const d = item.data;

    if (item.type === 'Objective') {
      if (d.description) lines.push(`Description: ${d.description}`);
      if (d.priorities?.length) {
        lines.push('Priorities:');
        for (const p of d.priorities) {
          lines.push(`  - ${p.name}${p.description ? ': ' + p.description : ''}`);
        }
      }
      if (d.steps?.length) {
        lines.push('Steps:');
        for (const s of d.steps) {
          lines.push(`  - ${s.name}${s.status ? ' (' + s.status + ')' : ''}`);
        }
      }
    } else if (item.type === 'Note') {
      if (d.content) lines.push(`Content: ${d.content}`);
    } else if (item.type === 'Folder') {
      if (d.name) lines.push(`Folder: ${d.name}`);
    }

    return lines.join('\n');
  });

  return '--- Selected Context ---\n' + blocks.join('\n\n') + '\n--- End Context ---\n\n';
}

// ========================================
// Context Search (@)
// ========================================

async function getSearchableItems() {
  const items = [];

  const data = Repository.loadData();
  if (data && data.objectives) {
    for (const obj of data.objectives) {
      items.push({ type: 'Objective', id: obj.id, name: obj.name, data: obj });
    }
  }

  try {
    const folders = await loadAllFolders();
    if (folders) {
      for (const f of folders) {
        items.push({ type: 'Folder', id: f.id, name: f.name, data: f });
      }
    }
  } catch { /* ignore */ }

  try {
    const notes = await loadAllNotes();
    if (notes) {
      for (const n of notes) {
        items.push({ type: 'Note', id: n.id, name: n.name, data: n });
      }
    }
  } catch { /* ignore */ }

  return items;
}

function initContextSearch() {
  const btn = document.getElementById('agent-context-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (contextMenuEl) {
      closeContextSearch();
    } else {
      openContextSearch();
    }
  });
}

async function openContextSearch() {
  closeContextSearch();

  const btn = document.getElementById('agent-context-btn');
  if (!btn) return;

  const rect = btn.getBoundingClientRect();

  contextMenuEl = document.createElement('div');
  contextMenuEl.className = 'context-search-menu';

  const input = document.createElement('input');
  input.className = 'context-search-input';
  input.type = 'text';
  input.placeholder = 'Search items...';
  input.autocomplete = 'off';
  contextMenuEl.appendChild(input);

  const results = document.createElement('div');
  results.className = 'context-search-results';
  contextMenuEl.appendChild(results);

  contextMenuEl.style.position = 'fixed';
  contextMenuEl.style.left = rect.left + 'px';
  contextMenuEl.style.bottom = (window.innerHeight - rect.top + 4) + 'px';

  document.body.appendChild(contextMenuEl);

  const menuRect = contextMenuEl.getBoundingClientRect();
  if (menuRect.right > window.innerWidth - 8) {
    contextMenuEl.style.left = (window.innerWidth - menuRect.width - 8) + 'px';
  }

  input.focus();
  await renderContextSearchResults('', results);

  input.addEventListener('input', () => {
    renderContextSearchResults(input.value.trim(), results);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContextSearch();
  });

  setTimeout(() => {
    document.addEventListener('click', handleContextSearchOutsideClick);
  }, 0);
}

function handleContextSearchOutsideClick(e) {
  if (contextMenuEl && !contextMenuEl.contains(e.target) &&
      e.target.id !== 'agent-context-btn' && !e.target.closest('#agent-context-btn')) {
    closeContextSearch();
  }
}

function closeContextSearch() {
  if (contextMenuEl) {
    contextMenuEl.remove();
    contextMenuEl = null;
  }
  document.removeEventListener('click', handleContextSearchOutsideClick);
}

async function renderContextSearchResults(query, container) {
  if (!container) return;

  const allItems = await getSearchableItems();
  const lowerQuery = query.toLowerCase();

  const filtered = query
    ? allItems.filter(item => item.name && item.name.toLowerCase().includes(lowerQuery))
    : allItems;

  const tab = chatTabs.find(t => t.id === activeTabId);
  const selectedIds = new Set((tab?.selectedContext || []).map(c => c.id));

  container.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'context-search-empty';
    empty.textContent = query ? 'No results found' : 'No items available';
    container.appendChild(empty);
    return;
  }

  for (const item of filtered) {
    const row = document.createElement('div');
    row.className = 'context-search-item' + (selectedIds.has(item.id) ? ' selected' : '');

    const icon = CHIP_ICONS[item.type] || '';
    row.innerHTML = `
      <svg class="context-search-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      <span class="context-search-item-name">${escapeHtml(item.name)}</span>
      <span class="context-search-item-type">${item.type}</span>
    `;

    row.addEventListener('click', () => {
      toggleContextItem(item);
      // Update selected state in menu
      row.classList.toggle('selected');
    });

    container.appendChild(row);
  }
}

// ========================================
// BroadcastChannel Active-Tab Sync
// ========================================

function initBroadcastChannel() {
  if (typeof BroadcastChannel === 'undefined') return;

  try {
    selectionChannel = new BroadcastChannel('layer-selection-sync');
    selectionChannel.onmessage = (event) => {
      const { id, type } = event.data || {};
      handleSelectionChange({ id, type });
    };
  } catch {
    // BroadcastChannel not available — chips still work statically
  }
}

async function handleSelectionChange({ id, type }) {
  const tab = chatTabs.find(t => t.id === activeTabId);
  if (!tab) return;
  if (!tab.selectedContext) tab.selectedContext = [];

  // Remove previous active-tab chip
  tab.selectedContext = tab.selectedContext.filter(c => !c.isActiveTab);

  const itemType = SELECTION_TYPE_MAP[type];
  if (!itemType || !id) {
    delete tab._dismissedActiveTabId;
    renderContextChips();
    return;
  }

  if (tab._dismissedActiveTabId === id) {
    renderContextChips();
    return;
  }

  delete tab._dismissedActiveTabId;

  // Resolve from all searchable items (objectives, folders, notes)
  const allItems = await getSearchableItems();
  const match = allItems.find(i => i.id === id && i.type === itemType);

  if (!match) {
    renderContextChips();
    return;
  }

  tab.selectedContext.push({
    id: match.id,
    type: match.type,
    name: match.name,
    data: match.data,
    isActiveTab: true
  });

  renderContextChips();
}

// ========================================
// Cleanup
// ========================================

function cleanup() {
  for (const [tabId] of tabStreamState) {
    cleanupTabStream(tabId);
  }
  if (selectionChannel) {
    selectionChannel.close();
    selectionChannel = null;
  }
}

// ========================================
// Boot
// ========================================

document.addEventListener('DOMContentLoaded', init);

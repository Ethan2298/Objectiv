/**
 * Anthropic Service
 *
 * Core service for LLM API calls with streaming support.
 * Supports Anthropic (Claude) and OpenRouter providers.
 * API keys are provided via Doppler secrets injection.
 */

import {
  ANTHROPIC_API_ENDPOINT,
  ANTHROPIC_MODEL,
  ANTHROPIC_MAX_TOKENS,
  OPENROUTER_API_ENDPOINT,
  MODEL_OPTIONS
} from '../config.js';

// ========================================
// Model Selection
// ========================================

const MODEL_STORAGE_KEY = 'layer-agent-model';

/**
 * Get the currently selected model config
 * @returns {{ id: string, label: string, provider: string }}
 */
export function getSelectedModelConfig() {
  const storedId = localStorage.getItem(MODEL_STORAGE_KEY);
  const found = MODEL_OPTIONS.find(m => m.id === storedId);
  return found || MODEL_OPTIONS[0];
}

// ========================================
// API Key Management (Doppler)
// ========================================

/**
 * Get API key for the current provider
 * @returns {string | null}
 */
export function getApiKey() {
  const model = getSelectedModelConfig();
  if (model.provider === 'openrouter') {
    return window.__DOPPLER_SECRETS__?.OPENROUTER_API_KEY || null;
  }
  return window.__DOPPLER_SECRETS__?.ANTHROPIC_API_KEY || null;
}

/**
 * Check if API key is configured for the current provider
 * @returns {boolean}
 */
export function hasApiKey() {
  const key = getApiKey();
  return !!(key && key.trim().length > 0);
}

// ========================================
// Streaming API Call
// ========================================

/**
 * Send a message with streaming response via the selected provider
 * @param {Object} options
 * @param {string} options.message - User message
 * @param {string} options.mode - 'Agent' or 'Ask'
 * @param {Array} options.conversationHistory - Previous messages for context
 * @param {Function} options.onChunk - Callback for each text chunk
 * @param {Function} options.onComplete - Callback when streaming completes
 * @param {Function} options.onError - Callback for errors
 * @param {AbortSignal} options.signal - AbortController signal for cancellation
 */
export async function sendMessage({
  message,
  mode,
  conversationHistory = [],
  onChunk,
  onComplete,
  onError,
  signal
}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    onError?.(new Error('NO_API_KEY'));
    return;
  }

  const model = getSelectedModelConfig();

  if (model.provider === 'openrouter') {
    return sendOpenRouterMessage({ message, mode, conversationHistory, onChunk, onComplete, onError, signal, apiKey, model });
  }

  return sendAnthropicMessage({ message, mode, conversationHistory, onChunk, onComplete, onError, signal, apiKey });
}

// ========================================
// Anthropic Provider
// ========================================

async function sendAnthropicMessage({ message, mode, conversationHistory, onChunk, onComplete, onError, signal, apiKey }) {
  const systemPrompt = mode === 'Agent'
    ? 'You are a helpful assistant that helps users accomplish tasks. Break down complex tasks into clear, actionable steps. Be concise but thorough. Focus on practical solutions.'
    : 'You are a helpful assistant that answers questions clearly and concisely. Provide accurate, well-structured information. If you\'re unsure about something, say so.';

  const messages = [
    ...conversationHistory,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch(ANTHROPIC_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        system: systemPrompt,
        messages,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.type = errorData.error?.type;
      throw error;
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            continue;
          }

          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.text) {
              const chunk = event.delta.text;
              fullText += chunk;
              onChunk?.(chunk, fullText);
            }

            if (event.type === 'message_stop') {
              onComplete?.(fullText);
              return;
            }

            if (event.type === 'error') {
              throw new Error(event.error?.message || 'Stream error');
            }
          } catch (parseError) {
            if (data.trim() && !data.startsWith('event:')) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    }

    onComplete?.(fullText);

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    onError?.(error);
  }
}

// ========================================
// OpenRouter Provider (OpenAI-compatible)
// ========================================

async function sendOpenRouterMessage({ message, mode, conversationHistory, onChunk, onComplete, onError, signal, apiKey, model }) {
  const systemPrompt = mode === 'Agent'
    ? 'You are a helpful assistant that helps users accomplish tasks. Break down complex tasks into clear, actionable steps. Be concise but thorough. Focus on practical solutions.'
    : 'You are a helpful assistant that answers questions clearly and concisely. Provide accurate, well-structured information. If you\'re unsure about something, say so.';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch(OPENROUTER_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        messages,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    // Parse OpenAI-style SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            onComplete?.(fullText);
            return;
          }

          try {
            const event = JSON.parse(data);
            const content = event.choices?.[0]?.delta?.content;

            if (content) {
              fullText += content;
              onChunk?.(content, fullText);
            }
          } catch (parseError) {
            if (data.trim()) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    }

    onComplete?.(fullText);

  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    onError?.(error);
  }
}

// ========================================
// Default Export
// ========================================

export default {
  getApiKey,
  hasApiKey,
  getSelectedModelConfig,
  sendMessage
};

/**
 * chat.tsx — DiscoveryCall chat module
 * Lazy-loaded on first widget button click.
 * Preact in Shadow DOM — zero CSS conflicts with host page.
 * ~80KB minified + gzipped target.
 *
 * SSE Protocol consumed:
 *   data: {"type":"token","content":"..."}    — stream token to current message
 *   data: {"type":"done","conversationId":"..."} — message complete
 *   data: {"type":"error","message":"..."}    — show error
 *   data: {"type":"unavailable","reason":"..."} — show system message
 */

import { h, render, Fragment } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

// ============ TYPES ============

interface DCConfig {
  enabled: boolean;
  agentId: string;
  displayName: string;
  themeColor: string;
  themeColorAccent: string | null;
  logoUrl: string | null;
  avatarUrl: string | null;
  buttonPosition: string;
  buttonShape: string;
  buttonSize: string;
  buttonIconUrl: string | null;
  pulseAnimation: boolean;
  greetingTitle: string;
  greetingMessage: string | null;
  showBranding: boolean;
  ctaType: string;
  calendarUrl: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

declare global {
  interface Window {
    __DC_CONFIG__?: DCConfig;
    __DC_TOKEN__?: string;
    __DC_SESSION__?: string;
    __DC_APP__?: string;
  }
}

// ============ CONSTANTS ============

const APP_URL = window.__DC_APP__ || 'https://app.discoverycall.ai';
const EMBED_TOKEN = window.__DC_TOKEN__ || '';
const SESSION_ID = window.__DC_SESSION__ || '';
const CONFIG: DCConfig = window.__DC_CONFIG__ || ({} as DCConfig);

// Conversation ID persisted across page loads for the 30-min resume window
const CONV_KEY = `dc_conv_${EMBED_TOKEN}`;
let storedConvId = localStorage.getItem(CONV_KEY) || '';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============ CSS ============

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

  .dc-panel {
    position: fixed;
    bottom: 96px;
    right: 20px;
    width: 380px;
    max-width: calc(100vw - 32px);
    height: 560px;
    max-height: calc(100vh - 120px);
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    z-index: 2147483639;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }

  .dc-panel.left {
    right: auto;
    left: 20px;
  }

  .dc-panel.hidden {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
    pointer-events: none;
  }

  .dc-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
    background: var(--dc-primary, #1783F1);
  }

  .dc-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: white;
    flex-shrink: 0;
    overflow: hidden;
  }

  .dc-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .dc-header-info { flex: 1; min-width: 0; }

  .dc-header-name {
    font-size: 15px;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dc-header-status {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dc-status-dot {
    width: 6px;
    height: 6px;
    background: #4ade80;
    border-radius: 50%;
  }

  .dc-close-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.8);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: background 0.15s;
  }

  .dc-close-btn:hover { background: rgba(255,255,255,0.15); }

  .dc-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }

  .dc-messages::-webkit-scrollbar { width: 4px; }
  .dc-messages::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }

  .dc-message {
    display: flex;
    gap: 8px;
    animation: dc-msg-in 0.2s ease;
  }

  @keyframes dc-msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dc-message.user { flex-direction: row-reverse; }

  .dc-bubble {
    max-width: 78%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .dc-message.agent .dc-bubble {
    background: #f4f4f5;
    color: #18181b;
    border-bottom-left-radius: 4px;
  }

  .dc-message.user .dc-bubble {
    background: var(--dc-primary, #1783F1);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .dc-message.system .dc-bubble {
    background: #fef9c3;
    color: #713f12;
    font-size: 13px;
    max-width: 90%;
    text-align: center;
    margin: 0 auto;
    border-radius: 10px;
  }

  .dc-typing {
    display: flex;
    gap: 4px;
    padding: 12px 14px;
    background: #f4f4f5;
    border-radius: 16px;
    border-bottom-left-radius: 4px;
    width: fit-content;
  }

  .dc-typing span {
    width: 6px;
    height: 6px;
    background: #a0a0a0;
    border-radius: 50%;
    animation: dc-bounce 1.2s ease infinite;
  }

  .dc-typing span:nth-child(2) { animation-delay: 0.2s; }
  .dc-typing span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dc-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }

  .dc-greeting {
    text-align: center;
    padding: 24px 20px 8px;
  }

  .dc-greeting-title {
    font-size: 20px;
    font-weight: 700;
    color: #18181b;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  .dc-greeting-sub {
    font-size: 14px;
    color: #71717a;
    line-height: 1.5;
  }

  .dc-input-area {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-shrink: 0;
    background: #fff;
  }

  .dc-input {
    flex: 1;
    border: 1.5px solid #e4e4e7;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    min-height: 42px;
    max-height: 120px;
    outline: none;
    color: #18181b;
    background: #fafafa;
    transition: border-color 0.15s;
    line-height: 1.4;
  }

  .dc-input:focus {
    border-color: var(--dc-primary, #1783F1);
    background: #fff;
  }

  .dc-input::placeholder { color: #a1a1aa; }

  .dc-send-btn {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--dc-primary, #1783F1);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s, transform 0.1s;
  }

  .dc-send-btn:hover { opacity: 0.88; }
  .dc-send-btn:active { transform: scale(0.93); }
  .dc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .dc-branding {
    text-align: center;
    padding: 6px;
    font-size: 11px;
    color: #a1a1aa;
  }

  .dc-branding a {
    color: #a1a1aa;
    text-decoration: none;
  }

  .dc-branding a:hover { color: #71717a; }

  /* Mobile full-screen */
  @media (max-width: 440px) {
    .dc-panel {
      bottom: 0;
      right: 0;
      left: 0;
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
`;

// ============ CHAT COMPONENT ============

function ChatPanel({ config, onClose }: { config: DCConfig; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string>(storedConvId);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // Focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    setIsSending(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add streaming placeholder
    const agentMsgId = generateId();
    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      streaming: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, agentMsg]);
    setIsStreaming(true);

    // Abort any in-flight request
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(`${APP_URL}/api/widget/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Embed-Token': EMBED_TOKEN,
          'X-Session-Id': SESSION_ID,
          'X-Source-Page': window.location.href,
        },
        body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr) as {
              type: string;
              content?: string;
              conversationId?: string;
              message?: string;
              reason?: string;
            };

            if (event.type === 'token' && event.content) {
              streamedContent += event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? { ...m, content: streamedContent }
                    : m
                )
              );
            } else if (event.type === 'done') {
              if (event.conversationId) {
                conversationIdRef.current = event.conversationId;
                storedConvId = event.conversationId;
                localStorage.setItem(CONV_KEY, event.conversationId);
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId ? { ...m, streaming: false } : m
                )
              );
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        content: event.message || "I'm having trouble responding. Please try again.",
                        streaming: false,
                      }
                    : m
                )
              );
            } else if (event.type === 'unavailable') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsgId
                    ? {
                        ...m,
                        content: streamedContent || 'This agent is currently unavailable.',
                        streaming: false,
                        role: 'system',
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User navigated away — no-op
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                content: "Connection interrupted. Please try again.",
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  }, [input, isSending]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInputChange = useCallback((e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setInput(target.value);
    // Auto-resize
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }, []);

  const isLeft = config.buttonPosition === 'bottom-left';

  return (
    <div class={`dc-panel ${isLeft ? 'left' : ''}`}>
      {/* Header */}
      <div class="dc-header">
        <div class="dc-avatar">
          {config.avatarUrl ? (
            <img src={config.avatarUrl} alt="" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </div>
        <div class="dc-header-info">
          <div class="dc-header-name">{config.displayName}</div>
          <div class="dc-header-status">
            <span class="dc-status-dot" />
            Online
          </div>
        </div>
        <button class="dc-close-btn" onClick={onClose} aria-label="Close chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div class="dc-messages">
        {messages.length === 0 && (
          <div class="dc-greeting">
            <div class="dc-greeting-title">{config.greetingTitle}</div>
            {config.greetingMessage && (
              <div class="dc-greeting-sub">{config.greetingMessage}</div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} class={`dc-message ${msg.role}`}>
            <div class="dc-bubble">
              {msg.content || (msg.streaming ? '' : '…')}
              {msg.streaming && !msg.content && (
                <div class="dc-typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role === 'agent' && messages[messages.length - 1]?.streaming && !messages[messages.length - 1]?.content && (
          <div class="dc-message agent">
            <div class="dc-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div class="dc-input-area">
        <textarea
          ref={inputRef}
          class="dc-input"
          placeholder="Type a message..."
          value={input}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isSending}
        />
        <button
          class="dc-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isSending}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Branding */}
      {config.showBranding && (
        <div class="dc-branding">
          Powered by <a href="https://discoverycall.ai" target="_blank" rel="noopener">DiscoveryCall</a>
        </div>
      )}
    </div>
  );
}

// ============ ROOT COMPONENT ============

function DiscoveryCallWidget({ config }: { config: DCConfig }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);

    // Fire Beacon on explicit close
    const payload = JSON.stringify({
      sessionId: SESSION_ID,
      embedToken: EMBED_TOKEN,
      conversationId: storedConvId,
      reason: 'close',
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${APP_URL}/api/widget/close`, payload);
    }
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  // Fire Beacon on page unload
  useEffect(() => {
    const handler = () => {
      if (!storedConvId) return;
      const payload = JSON.stringify({
        sessionId: SESSION_ID,
        embedToken: EMBED_TOKEN,
        conversationId: storedConvId,
        reason: 'unload',
      });
      navigator.sendBeacon?.(`${APP_URL}/api/widget/close`, payload);
    };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, []);

  // Expose toggle for the loader button to call
  useEffect(() => {
    const panel = document.getElementById('dc-chat-panel');
    if (panel) {
      (panel as HTMLElement & { __toggle?: () => void }).__toggle = () => setIsOpen((v) => !v);
    }
  });

  // Open on mount (first load)
  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <Fragment>
      {isOpen && <ChatPanel config={config} onClose={handleClose} />}
    </Fragment>
  );
}

// ============ BOOTSTRAP ============

function init(): void {
  if (!CONFIG || !EMBED_TOKEN) {
    console.warn('[DiscoveryCall] Widget config not found');
    return;
  }

  // Create Shadow DOM host
  const host = document.createElement('div');
  host.id = 'dc-chat-panel';
  host.setAttribute('data-dc', '1');
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles into shadow root
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS.replace(
    /var\(--dc-primary, #1783F1\)/g,
    `var(--dc-primary, ${CONFIG.themeColor || '#1783F1'})`
  );
  shadow.appendChild(styleEl);

  // Set CSS variable
  const container = document.createElement('div');
  container.style.setProperty('--dc-primary', CONFIG.themeColor || '#1783F1');
  shadow.appendChild(container);

  // Render Preact component into shadow DOM
  render(h(DiscoveryCallWidget, { config: CONFIG }), container);
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

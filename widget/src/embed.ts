/**
 * embed.js — DiscoveryCall widget loader
 * Target: <8KB minified + gzipped
 * Vanilla JS (no dependencies) — loads chat module lazily on first click
 *
 * Usage:
 *   <script src="https://embed.discoverycall.ai/embed.js" data-token="YOUR_TOKEN" async></script>
 */

(function () {
  'use strict';

  const script = document.currentScript as HTMLScriptElement;
  if (!script) return;

  const token = script.getAttribute('data-token');
  if (!token || token.length !== 64) return;

  // Config endpoint (served from app, CDN-cached)
  const APP_URL = (script.getAttribute('data-app') || 'https://app.discoverycall.ai').replace(
    /\/$/,
    ''
  );

  // Session ID — persisted in localStorage across page loads for conversation continuity
  const SESSION_KEY = `dc_session_${token}`;
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  let chatLoaded = false;
  let buttonEl: HTMLElement | null = null;

  function generateId(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fetch widget config
  fetch(`${APP_URL}/api/widget/config/${token}`, {
    credentials: 'omit',
    cache: 'default',
  })
    .then((r) => {
      if (!r.ok) return null;
      return r.json();
    })
    .then((config) => {
      if (!config || !config.enabled) return;
      buttonEl = createButton(config);
      document.body.appendChild(buttonEl);

      buttonEl.addEventListener('click', () => {
        if (!chatLoaded) {
          loadChatModule(config);
          chatLoaded = true;
        } else {
          // Toggle visibility
          const panel = document.getElementById('dc-chat-panel');
          if (panel) {
            (panel as HTMLElement & { __toggle?: () => void }).__toggle?.();
          }
        }
      });
    })
    .catch(() => {
      // Silent fail — never log to host page console
    });

  function createButton(config: {
    themeColor: string;
    buttonPosition: string;
    buttonShape: string;
    buttonSize: string;
    pulseAnimation: boolean;
    logoUrl?: string | null;
  }): HTMLElement {
    const btn = document.createElement('button');
    btn.id = 'dc-widget-btn';
    btn.setAttribute('aria-label', 'Open chat');
    btn.setAttribute('data-dc', '1');

    // Size map
    const sizeMap: Record<string, string> = {
      small: '48px',
      medium: '60px',
      large: '72px',
    };
    const size = sizeMap[config.buttonSize] || '60px';

    // Shape radius
    const radiusMap: Record<string, string> = {
      circle: '50%',
      pill: '999px',
      square: '12px',
    };
    const radius = radiusMap[config.buttonShape] || '50%';

    // Position
    const pos = config.buttonPosition || 'bottom-right';
    const isLeft = pos === 'bottom-left';

    btn.style.cssText = `
      position: fixed;
      ${isLeft ? 'left: 20px' : 'right: 20px'};
      bottom: 20px;
      width: ${size};
      height: ${size};
      background: ${config.themeColor || '#1783F1'};
      border: none;
      border-radius: ${radius};
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      z-index: 2147483640;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    `;

    // Chat icon SVG
    btn.innerHTML = config.logoUrl
      ? `<img src="${config.logoUrl}" style="width:60%;height:60%;object-fit:contain;border-radius:4px" alt="" />`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

    // Hover
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.22)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
    });

    // Pulse animation
    if (config.pulseAnimation) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes dc-pulse {
          0% { box-shadow: 0 0 0 0 ${config.themeColor}60; }
          70% { box-shadow: 0 0 0 12px ${config.themeColor}00; }
          100% { box-shadow: 0 0 0 0 ${config.themeColor}00; }
        }
        #dc-widget-btn { animation: dc-pulse 2s ease-in-out 2s 3; }
      `;
      document.head.appendChild(style);
    }

    return btn;
  }

  function loadChatModule(config: Record<string, unknown>): void {
    // Inject config for the chat module to read
    (window as Window & { __DC_CONFIG__?: Record<string, unknown>; __DC_TOKEN__?: string; __DC_SESSION__?: string; __DC_APP__?: string }).__DC_CONFIG__ = config;
    (window as Window & { __DC_CONFIG__?: Record<string, unknown>; __DC_TOKEN__?: string; __DC_SESSION__?: string; __DC_APP__?: string }).__DC_TOKEN__ = token!;
    (window as Window & { __DC_CONFIG__?: Record<string, unknown>; __DC_TOKEN__?: string; __DC_SESSION__?: string; __DC_APP__?: string }).__DC_SESSION__ = sessionId!;
    (window as Window & { __DC_CONFIG__?: Record<string, unknown>; __DC_TOKEN__?: string; __DC_SESSION__?: string; __DC_APP__?: string }).__DC_APP__ = APP_URL;

    const s = document.createElement('script');
    s.src = `${APP_URL.replace('app.', 'embed.')}/chat.js`;
    s.async = true;
    s.onerror = () => {
      // Fallback: try loading from app URL
      const fallback = document.createElement('script');
      fallback.src = `${APP_URL}/embed/chat.js`;
      fallback.async = true;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(s);
  }
})();

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Test harness for `tests/react-host-compatibility.spec.ts`. Each page load is
 * a fresh module graph and custom-element registry.
 *
 * `?order=` loads the React and web-component entries in the order it names:
 *
 * - `react,wc`: React chat, then the web-component entry.
 * - `wc,react`: the web-component entry, then the React chat.
 * - `wait`: the React entry, then a plain `cds-aichat-container`, then the
 *   web-component entry, which must wake that element.
 *
 * `?surface=` mounts one chat with page-styled content in every slot kind:
 *
 * - `react-container`: a float React `ChatContainer` beside page content.
 * - `react-custom`: a React `ChatCustomElement`, sized 400×600.
 * - `wc-container`: a `cds-aichat-container` element.
 * - `wc-custom`: a `cds-aichat-custom-element`, sized 400×600.
 *
 * Every surface renders inline code through a plugin as page-styled output,
 * and leaves `fallbackCard` input nodes to their fallback label.
 */

import type {
  ChatInstance,
  HistoryItem,
  MarkdownItPlugin,
  PublicConfig,
} from '@carbon/ai-chat';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';

interface Harness {
  reactInstance?: ChatInstance;
  wcInstance?: ChatInstance;
  setTheme?: (theme: string) => void;
  scrollHeightBefore?: number;
  loaded: string[];
}

declare global {
  interface Window {
    hostCompatibility: Harness;
  }
}

const harness: Harness = { loaded: [] };
window.hostCompatibility = harness;

const time = new Date().toISOString();

/** A custom input node type the surfaces render as its fallback label. */
const FALLBACK_NODE = 'fallbackCard';

const inlinePlugin: MarkdownItPlugin = (md) => {
  md.renderer.rules.code_inline = (tokens, index) =>
    `<span class="page-styled" data-kind="inline-plugin">${md.utils.escapeHtml(tokens[index].content)}</span>`;
};

const config: PublicConfig = {
  openChatByDefault: true,
  markdown: { markdownItPlugins: [inlinePlugin] },
  messaging: {
    customSendMessage: () => undefined,
    // A welcome exchange in history shows the welcome writeable element.
    customLoadHistory: async () =>
      [
        {
          time,
          message: {
            id: 'welcome',
            input: { text: '' },
            history: { is_welcome_request: true, silent: true },
          },
        },
        {
          time,
          message: {
            id: 'welcome-response',
            request_id: 'welcome',
            output: { generic: [{ response_type: 'text', text: 'Welcome' }] },
          },
        },
      ] as HistoryItem[],
  },
};

const ThemeContext = createContext('none');

function Counter() {
  const theme = useContext(ThemeContext);
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      className="host-compat-udr"
      data-testid="host_compat_udr"
      onClick={() => setCount(count + 1)}>
      {theme}:{count}
    </button>
  );
}

/** Content for each slot kind, carrying the class the page stylesheet sets. */
function pageStyled(kind: string) {
  return (
    <span className="page-styled" data-kind={kind}>
      {kind}
    </span>
  );
}

function pageStyledElement(kind: string) {
  const element = document.createElement('span');
  element.className = 'page-styled';
  element.dataset.kind = kind;
  element.textContent = kind;
  return element;
}

/**
 * Renders page content, records the page height, and then mounts the chat
 * beside it. Without a surface, the chat renders a stateful counter that reads
 * host context. Settles once the chat has rendered.
 */
async function mountReact(surface?: string) {
  const { ChatContainer, ChatCustomElement } = await import('@carbon/ai-chat');
  let rendered: () => void;
  const done = new Promise<void>((resolve) => {
    rendered = resolve;
  });
  const props = {
    ...config,
    onBeforeRender: (instance: ChatInstance) => {
      harness.reactInstance = instance;
    },
    onAfterRender: () => rendered(),
  };
  const slotProps = surface
    ? {
        renderUserDefinedResponse: () => pageStyled('user-defined-response'),
        renderCustomMessageFooter: () => pageStyled('message-footer'),
        renderCustomRequestFooter: () => pageStyled('request-footer'),
        renderUserDefinedInputNode: ({ node }: { node: { type?: string } }) =>
          node.type === FALLBACK_NODE ? null : pageStyled('input-node'),
        renderWriteableElements: {
          welcomeNodeBeforeElement: pageStyled('writeable-element'),
        },
      }
    : {};
  function Host() {
    const [theme, setTheme] = useState('light');
    const [showChat, setShowChat] = useState(false);
    harness.setTheme = setTheme;
    useEffect(() => {
      harness.scrollHeightBefore = document.documentElement.scrollHeight;
      setShowChat(true);
    }, []);
    let chat: ReactNode = null;
    if (showChat && surface === 'react-custom') {
      chat = <ChatCustomElement {...props} {...slotProps} className="sized" />;
    } else if (showChat) {
      chat = (
        <ChatContainer
          renderUserDefinedResponse={() => <Counter />}
          {...props}
          {...slotProps}
        />
      );
    }
    return (
      <ThemeContext.Provider value={theme}>
        <p>Page content</p>
        {chat}
      </ThemeContext.Provider>
    );
  }
  createRoot(document.getElementById('root') as HTMLElement).render(<Host />);
  await done;
  harness.loaded.push('react');
}

async function loadWebComponents() {
  await import('@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js');
  harness.loaded.push('wc');
}

function connectPlainElement() {
  const element = document.createElement(
    'cds-aichat-container'
  ) as HTMLElement & {
    config: PublicConfig;
    onBeforeRender: (instance: ChatInstance) => void;
  };
  element.id = 'plain-host';
  element.config = config;
  element.onBeforeRender = (instance) => {
    harness.wcInstance = instance;
  };
  document.getElementById('root')?.appendChild(element);
  harness.loaded.push('plain');
}

/** Mounts a web-component chat with page-styled content in every slot kind. */
async function mountWebComponent(surface: string) {
  let tagName = 'cds-aichat-container';
  if (surface === 'wc-custom') {
    tagName = 'cds-aichat-custom-element';
    await import('@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js');
  } else {
    await loadWebComponents();
  }
  const element = document.createElement(tagName) as HTMLElement &
    Record<string, unknown>;
  if (surface === 'wc-custom') {
    element.className = 'sized';
  }
  element.config = config;
  element.renderUserDefinedResponse = () =>
    pageStyledElement('user-defined-response');
  element.renderCustomMessageFooter = () => pageStyledElement('message-footer');
  element.renderCustomRequestFooter = () => pageStyledElement('request-footer');
  element.renderUserDefinedInputNode = ({
    node,
  }: {
    node: { type?: string };
  }) => (node.type === FALLBACK_NODE ? null : pageStyledElement('input-node'));
  element.onBeforeRender = (instance: ChatInstance) => {
    harness.wcInstance = instance;
    instance.writeableElements.welcomeNodeBeforeElement?.appendChild(
      pageStyledElement('writeable-element')
    );
  };
  document.getElementById('root')?.appendChild(element);
  harness.loaded.push(surface);
}

async function run() {
  const params = new URLSearchParams(window.location.search);
  const surface = params.get('surface');
  if (surface?.startsWith('wc-')) {
    await mountWebComponent(surface);
    return;
  }
  if (surface) {
    await mountReact(surface);
    return;
  }
  const order = params.get('order') ?? 'react,wc';
  if (order === 'wait') {
    await import('@carbon/ai-chat');
    harness.loaded.push('react-entry');
    connectPlainElement();
    // Let the element connect and settle before its renderer exists.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await loadWebComponents();
    return;
  }
  for (const step of order.split(',')) {
    await (step === 'wc' ? loadWebComponents() : mountReact());
  }
}

run();

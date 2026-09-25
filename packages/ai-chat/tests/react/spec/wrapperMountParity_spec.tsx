/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * How each host mounts the chat. React wrappers render inside the host's own
 * React root and add none; a plain web component owns exactly one. A fresh
 * mount gets a fresh instance, two chats stay apart, and React moving a
 * wrapper among its siblings keeps the running chat.
 */

import React, { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import {
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

jest.mock('react-dom/client', () => {
  const actual = jest.requireActual('react-dom/client');
  return {
    ...actual,
    createRoot: jest.fn((...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args);
      root.unmount = jest.fn(root.unmount.bind(root));
      return root;
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as {
  createRoot: jest.Mock;
};

type ChatElement = HTMLElement & {
  config: PublicConfig;
  onBeforeRender: (instance: ChatInstance) => unknown;
  onAfterRender: (instance: ChatInstance) => unknown;
  renderUserDefinedResponse?: () => HTMLElement | null;
  updateComplete: Promise<boolean>;
};

/** The render target inside the chat's shadow root. */
function renderTargetIn(root: ParentNode = document) {
  return (
    getChatShadowRoot(root)?.querySelector('.cds-aichat--react-app') ?? null
  );
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function createElementChat(tag: string, config: PublicConfig = {}) {
  const instances: ChatInstance[] = [];
  const onAfterRender = jest.fn();
  const element = document.createElement(tag) as ChatElement;
  element.config = { ...createBaseConfig(), ...config };
  element.onBeforeRender = (instance) => {
    instances.push(instance);
  };
  element.onAfterRender = onAfterRender;
  return { element, instances, onAfterRender };
}

describe('how each host mounts the chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe('React roots', () => {
    it('adds no root for a React wrapper, across config and renderer updates', async () => {
      const before = createRoot.mock.calls.length;
      let instance: ChatInstance | null = null;
      const onBeforeRender = (chat: ChatInstance) => {
        instance = chat;
      };
      const view = render(
        <ChatContainer
          {...createBaseConfig()}
          onBeforeRender={onBeforeRender}
        />
      );
      // Testing Library creates the host's own root.
      expect(createRoot.mock.calls.length).toBe(before + 1);
      await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });

      view.rerender(
        <ChatContainer
          {...createBaseConfig()}
          assistantName="Updated"
          onBeforeRender={onBeforeRender}
          renderUserDefinedResponse={() => <p>content</p>}
        />
      );
      await waitFor(() =>
        expect(
          instance.serviceManager.store.getState().config.public.assistantName
        ).toBe('Updated')
      );

      expect(createRoot.mock.calls.length).toBe(before + 1);
    });

    it('gives a plain web component one root, reused across updates and unmounted on removal', async () => {
      const before = createRoot.mock.calls.length;
      const { element, instances, onAfterRender } = createElementChat(
        'cds-aichat-container'
      );
      document.body.appendChild(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      expect(createRoot.mock.calls.length).toBe(before + 1);

      element.config = { ...element.config, assistantName: 'Updated' };
      element.renderUserDefinedResponse = () => document.createElement('p');
      await element.updateComplete;
      await waitFor(() =>
        expect(
          instances[0].serviceManager.store.getState().config.public
            .assistantName
        ).toBe('Updated')
      );
      expect(createRoot.mock.calls.length).toBe(before + 1);

      const root = createRoot.mock.results[before].value;
      element.remove();
      expect(root.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('fresh mounts', () => {
    it('renders one shell and announcer under StrictMode', async () => {
      const onAfterRender = jest.fn();
      render(
        <StrictMode>
          <ChatContainer
            {...createBaseConfig()}
            onAfterRender={onAfterRender}
          />
        </StrictMode>
      );
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });

      expect(document.querySelectorAll(getChatHost().localName)).toHaveLength(
        1
      );
      const target = renderTargetIn();
      expect(target.querySelectorAll('.cds-aichat--widget')).toHaveLength(1);
      expect(
        target.querySelectorAll('.cds-aichat--aria-announcer')
      ).toHaveLength(1);
    });

    it('keeps two chats independent', async () => {
      const instances: ChatInstance[] = [];
      const capture = (chat: ChatInstance) => {
        instances.push(chat);
      };
      render(
        <>
          <div data-chat="first">
            <ChatContainer {...createBaseConfig()} onBeforeRender={capture} />
          </div>
          <div data-chat="second">
            <ChatContainer {...createBaseConfig()} onBeforeRender={capture} />
          </div>
        </>
      );
      await waitFor(() => expect(instances).toHaveLength(2), {
        timeout: 5000,
      });

      const [first, second] = ['first', 'second'].map((name) =>
        renderTargetIn(document.querySelector(`[data-chat="${name}"]`))
      );
      expect(first).not.toBeNull();
      expect(first).not.toBe(second);
      expect(instances[0]).not.toBe(instances[1]);
      const targets = instances.map((chat) => chat.serviceManager.container);
      expect(targets).toEqual(expect.arrayContaining([first, second]));
    });

    it('gives a remounted React wrapper a fresh instance', async () => {
      const instances: ChatInstance[] = [];
      const capture = (chat: ChatInstance) => {
        instances.push(chat);
      };
      const first = render(
        <ChatCustomElement
          {...createBaseConfig()}
          className="chat-host"
          onBeforeRender={capture}
        />
      );
      await waitFor(() => expect(instances).toHaveLength(1), { timeout: 5000 });
      first.unmount();

      render(
        <ChatCustomElement
          {...createBaseConfig()}
          className="chat-host"
          onBeforeRender={capture}
        />
      );
      await waitFor(() => expect(instances).toHaveLength(2), { timeout: 5000 });
      expect(instances[1]).not.toBe(instances[0]);
    });
  });

  describe('moves', () => {
    it('keeps one instance when React moves the wrapper among keyed siblings', async () => {
      const onBeforeRender = jest.fn();
      const onAfterRender = jest.fn();
      const chat = (
        <ChatContainer
          key="chat"
          {...createBaseConfig()}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
      const sibling = (
        <p key="sibling" data-probe="sibling">
          Sibling
        </p>
      );
      const view = render(<div>{[chat, sibling]}</div>);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      const host = getChatHost();
      expect(host.previousSibling).toBeNull();
      const removed: Node[] = [];
      const observer = new MutationObserver((records) => {
        records.forEach((record) => removed.push(...record.removedNodes));
      });
      observer.observe(host.parentNode, { childList: true });

      view.rerender(<div>{[sibling, chat]}</div>);
      await settle();
      observer.disconnect();

      // React took the host out of the DOM and put it back after the sibling.
      expect(removed).toContain(host);
      expect(host.previousSibling).toBe(
        document.querySelector('[data-probe="sibling"]')
      );
      expect(getChatHost()).toBe(host);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onAfterRender).toHaveBeenCalledTimes(1);
      expect(renderTargetIn()?.childElementCount).toBeGreaterThan(0);
    });
  });
});

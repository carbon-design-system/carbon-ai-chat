/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Config changes reach a running chat without restarting it. A change made
 * while `onBeforeRender` is still pending waits for the gate and then applies
 * to the original instance. A change with no new content leaves the store
 * untouched, and no change drops the conversation.
 *
 * The gate case runs on `cds-aichat-container` only: React `ChatContainer`
 * doesn't await `onBeforeRender` yet.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

type ContainerElement = HTMLElement & {
  config: PublicConfig;
  markdown?: PublicConfig['markdown'];
  onBeforeRender: (instance: ChatInstance) => Promise<void> | void;
  onAfterRender: (instance: ChatInstance) => void;
  updateComplete: Promise<boolean>;
};

function storeOf(instance: ChatInstance) {
  return instance.serviceManager.store;
}

interface Surface {
  name: string;
  /** Boots the chat and returns a function that sets config fields on it. */
  boot: (
    onBeforeRender: (instance: ChatInstance) => Promise<void> | void,
    onAfterRender: (instance: ChatInstance) => void,
    initial?: PublicConfig
  ) => (fields: Partial<PublicConfig>) => Promise<void>;
}

const base = createBaseConfig();

const reactSurface: Surface = {
  name: 'React ChatContainer',
  boot: (onBeforeRender, onAfterRender, initial = base) => {
    let fields: Partial<PublicConfig> = {};
    const view = render(
      <ChatContainer
        {...initial}
        onBeforeRender={onBeforeRender}
        onAfterRender={onAfterRender}
      />
    );
    return async (next) => {
      fields = { ...fields, ...next };
      view.rerender(
        <ChatContainer
          {...initial}
          {...fields}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
    };
  },
};

const webComponentSurface: Surface = {
  name: 'cds-aichat-container',
  boot: (onBeforeRender, onAfterRender, initial = base) => {
    const element = document.createElement(
      'cds-aichat-container'
    ) as ContainerElement;
    element.config = initial;
    element.onBeforeRender = onBeforeRender;
    element.onAfterRender = onAfterRender;
    document.body.appendChild(element);
    return async (next) => {
      Object.assign(element, next);
      await element.updateComplete;
    };
  },
};

describe.each([webComponentSurface])(
  'config updates through $name',
  (surface) => {
    beforeEach(setupBeforeEach);
    afterEach(setupAfterEach);

    it('applies changes made during onBeforeRender to the original instance once the gate opens', async () => {
      const gate = resolvablePromise();
      const onBeforeRender = jest.fn((_instance: ChatInstance) => gate);
      const onAfterRender = jest.fn();
      const set = surface.boot(onBeforeRender, onAfterRender);
      await waitFor(() => expect(onBeforeRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      const instance: ChatInstance = onBeforeRender.mock.calls[0][0];

      await set({ assistantName: 'First' });
      await set({ assistantName: 'Second', isReadonly: true });
      expect(storeOf(instance).getState().config.public.assistantName).toBe(
        'watsonx'
      );

      gate.doResolve();
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(storeOf(instance).getState().config.public.assistantName).toBe(
          'Second'
        )
      );
      expect(storeOf(instance).getState().config.public.isReadonly).toBe(true);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
    });
  }
);

describe('config updates after startup', () => {
  const surface = reactSurface;

  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('leaves the store untouched when a change carries no new content', async () => {
    const onBeforeRender = jest.fn(
      (_instance: ChatInstance): void => undefined
    );
    const onAfterRender = jest.fn();
    const set = surface.boot(onBeforeRender, onAfterRender);
    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    const instance: ChatInstance = onBeforeRender.mock.calls[0][0];
    const before = storeOf(instance).getState().config;

    await set({ header: { title: 'Same' } });
    await waitFor(() =>
      expect(storeOf(instance).getState().config.public.header.title).toBe(
        'Same'
      )
    );
    const afterFirst = storeOf(instance).getState().config;
    expect(afterFirst).not.toBe(before);

    await set({ header: { title: 'Same' } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(storeOf(instance).getState().config).toBe(afterFirst);
  });

  it('replaces and then removes markdown options', async () => {
    const onBeforeRender = jest.fn(
      (_instance: ChatInstance): void => undefined
    );
    const onAfterRender = jest.fn();
    const set = surface.boot(onBeforeRender, onAfterRender);
    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    const instance: ChatInstance = onBeforeRender.mock.calls[0][0];
    const plugin = (): void => undefined;

    const first = { markdownItPlugins: [plugin] };
    await set({ markdown: first });
    await waitFor(() =>
      expect(storeOf(instance).getState().markdownConfig).toBe(first)
    );

    const second = { markdownItPlugins: [plugin, plugin] };
    await set({ markdown: second });
    await waitFor(() =>
      expect(storeOf(instance).getState().markdownConfig).toBe(second)
    );

    await set({ markdown: undefined });
    await waitFor(() =>
      expect(storeOf(instance).getState().markdownConfig).toBeUndefined()
    );
  });
});

describe.each([reactSurface, webComponentSurface])(
  'the conversation across a config change on $name',
  (surface) => {
    beforeEach(setupBeforeEach);
    afterEach(setupAfterEach);

    function messageNodes() {
      const target = deepQuerySelector(document, '.cds-aichat--react-app');
      return Array.from(target?.querySelectorAll('.cds-aichat--message') ?? []);
    }

    it('keeps message IDs and message nodes', async () => {
      const onBeforeRender = jest.fn(
        (_instance: ChatInstance): void => undefined
      );
      const onAfterRender = jest.fn();
      const set = surface.boot(onBeforeRender, onAfterRender, {
        ...base,
        openChatByDefault: true,
      });
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      const instance: ChatInstance = onBeforeRender.mock.calls[0][0];
      await act(() =>
        instance.messaging.addMessage({
          id: 'kept-reply',
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'Kept reply' },
            ],
          },
        })
      );
      await waitFor(() =>
        expect(
          messageNodes().some((node) =>
            node.classList.contains('cds-aichat--message--response')
          )
        ).toBe(true)
      );
      const messageIDs = [
        ...storeOf(instance).getState().assistantMessageState.messageIDs,
      ];
      expect(messageIDs).toContain('kept-reply');
      const nodes = messageNodes();

      await set({ assistantName: 'Renamed' });
      await waitFor(() =>
        expect(storeOf(instance).getState().config.public.assistantName).toBe(
          'Renamed'
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(
        storeOf(instance).getState().assistantMessageState.messageIDs
      ).toEqual(messageIDs);
      const after = messageNodes();
      expect(after).toHaveLength(nodes.length);
      nodes.forEach((node, index) => expect(after[index]).toBe(node));
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
    });
  }
);

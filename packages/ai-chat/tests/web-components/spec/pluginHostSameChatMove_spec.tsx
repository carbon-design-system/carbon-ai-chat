/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Same-chat retention with a real chat element. Moving a whole
 * `cds-aichat-custom-element` in one task runs its deferred disconnect, its
 * `connect()` and the inner container's update and `renderApp` path. A
 * `customRenderers` result must survive that move: same node, same value, no
 * second render and no second mount offer.
 */

import { act, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import '../../../src/web-components/cds-aichat-custom-element';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const MOUNT = 'cds-aichat-markdown-plugin-host-mount';

type ChatElement = HTMLElement & {
  config: unknown;
  markdown: unknown;
  onAfterRender: (instance: ChatInstance) => void;
  updateComplete: Promise<boolean>;
};

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('keeps a custom-renderer table through a same-task move of the whole cds-aichat-custom-element', async () => {
  let renders = 0;
  const table = () => {
    renders += 1;
    const input = document.createElement('input');
    input.dataset.testid = 'retained-table';
    return input;
  };
  let instance: ChatInstance;
  const after = jest.fn((chat: ChatInstance) => {
    instance = chat;
  });
  const element = document.createElement(
    'cds-aichat-custom-element'
  ) as ChatElement;
  element.config = {
    ...createBaseConfig(),
    openChatByDefault: true,
    homescreen: { isOn: false },
  };
  element.markdown = { customRenderers: { table } };
  element.onAfterRender = after;
  const first = document.createElement('div');
  const second = document.createElement('div');
  document.body.append(first, second);
  first.appendChild(element);
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 8000,
  });

  await act(async () => {
    await instance.messaging.addMessage({
      id: 'same-chat-move',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: '| a | b |\n| --- | --- |\n| 1 | 2 |',
          },
        ],
      },
    });
  });
  const find = () =>
    deepQuerySelector(
      document,
      '[data-testid="retained-table"]'
    ) as HTMLInputElement | null;
  await waitFor(() => expect(find()).not.toBeNull(), { timeout: 5000 });
  const input = find();
  input.value = 'retained value';
  const host = input.parentElement;
  expect(host?.assignedSlot).not.toBeNull();
  const initialRenders = renders;
  const offers = jest.fn();
  document.addEventListener(MOUNT, offers, true);

  try {
    // One task: the element disconnects and reconnects before any microtask.
    second.appendChild(element);
    await act(async () => {
      await element.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await element.updateComplete;
    });

    expect(element.parentElement).toBe(second);
    expect(find()).toBe(input);
    expect(input.isConnected).toBe(true);
    expect(input.value).toBe('retained value');
    expect(input.parentElement).toBe(host);
    expect(host?.assignedSlot).not.toBeNull();
    expect(renders).toBe(initialRenders);
    expect(offers).not.toHaveBeenCalled();
  } finally {
    document.removeEventListener(MOUNT, offers, true);
  }
});

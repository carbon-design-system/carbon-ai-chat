/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * PLAN-11 O9 follow-up: a native render failure keeps the error view styled
 * and keeps the window open state live, through both public wrappers.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import ChatShell from '../../../src/chat/components/shell/ChatShell';
import * as styleInjection from '../../../src/chat/utils/styleInjection';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

async function boot(
  Wrapper: (typeof wrappers)[number][1],
  props: Partial<ChatContainerProps> = {}
) {
  let instance: ChatInstance;
  const onError = jest.fn();
  const after = jest.fn();
  render(
    React.createElement(Wrapper, {
      ...createBaseConfig(),
      className: '',
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      homescreen: { isOn: false },
      ...props,
      onError,
      onBeforeRender: (chat: ChatInstance) => {
        instance = chat;
      },
      onAfterRender: after,
    })
  );
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  return { instance, root, view, onError };
}

beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe.each(wrappers)('native shell failure through %s', (_name, Wrapper) => {
  it('styles the error view when the first native render fails', async () => {
    const inject = jest.spyOn(styleInjection, 'injectStyles');
    jest
      .spyOn(ChatShell.prototype as any, 'renderView')
      .mockImplementationOnce(() => {
        throw new Error('First native render failed');
      });
    const f = await boot(Wrapper);
    await waitFor(() => expect(f.onError).toHaveBeenCalledTimes(1));
    const container = f.view.querySelector<HTMLElement>(
      '.cds-aichat--container--render'
    );
    expect(container).not.toBeNull();
    await waitFor(() =>
      expect(
        inject.mock.calls.some(([options]) => options.container === container)
      ).toBe(true)
    );
  });
});

// A custom host element closes by hiding the host, not with the float class,
// so this case runs through ChatContainer.
it('closes the ChatContainer window after a native failure when the host changes the view', async () => {
  const f = await boot(ChatContainer);
  await f.view.whenReady();
  jest.spyOn(f.view as any, 'renderView').mockImplementationOnce(() => {
    throw new Error('Native render failed');
  });
  act(() => {
    f.view.requestUpdate();
  });
  await waitFor(() => expect(f.onError).toHaveBeenCalledTimes(1));
  const widget = f.view.querySelector<HTMLElement>('cds-aichat-shell');
  expect(widget).not.toBeNull();

  await act(async () => {
    await f.instance.changeView({ mainWindow: false, launcher: true });
  });

  await waitFor(() =>
    expect(widget.classList.contains('cds-aichat-float--close')).toBe(true)
  );
});

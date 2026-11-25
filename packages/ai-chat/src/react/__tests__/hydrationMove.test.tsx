/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { flushSync } from 'react-dom';
import { act, render, waitFor } from '@testing-library/react';
import { ChatContainer } from '../ChatContainer';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type HydrationBody from '../../chat/components/panels/native/HydrationBody';
import type { ChatMountState } from '../../chat/services/chatMountState';
import {
  createBaseConfig,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';

// Each wrapper case must boot from a fresh session, not the previous one's.
beforeEach(() => {
  setupBeforeEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  setupAfterEach();
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([['ChatContainer', ChatContainer]] as const)(
  'keeps the loading spinner and notice when %s moves within one task',
  async (_name, Wrapper) => {
    let instance: ChatInstance;
    const before = vi.fn((chat: ChatInstance) => {
      instance = chat;
    });
    const after = vi.fn();
    const mounted = render(
      <Wrapper
        {...createBaseConfig()}
        className=""
        openChatByDefault
        onBeforeRender={before}
        onAfterRender={after}
      />
    );
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const body = getChatShadowRoot().querySelector<HydrationBody>(
      'cds-aichat-hydration-body'
    );
    await waitFor(() =>
      expect(body.querySelector('cds-loading')).not.toBeNull()
    );
    const { viewState } = body as unknown as { viewState: ChatMountState };
    const announce = vi
      .spyOn(viewState.announcer, 'announce')
      .mockImplementation(() => {});
    act(() => instance.updateIsChatLoadingCounter('increase'));
    const notice =
      instance.serviceManager.store.getState().languagePack
        .window_ariaWindowLoading;
    await waitFor(() => expect(announce).toHaveBeenCalledWith(notice));
    const noticeCount = () =>
      announce.mock.calls.filter(([text]) => text === notice).length;
    expect(noticeCount()).toBe(1);
    const spinner = body.querySelector('cds-loading');
    const publicHost = mounted.container.firstElementChild;
    const parent = publicHost.parentNode;
    vi.useFakeTimers();
    await act(async () => {
      flushSync(() => {
        publicHost.remove();
        parent.appendChild(publicHost);
      });
      await body.updateComplete;
    });
    expect(getChatShadowRoot().querySelector('cds-aichat-hydration-body')).toBe(
      body
    );
    expect(body.querySelector('cds-loading')).toBe(spinner);
    await act(async () => {
      vi.advanceTimersByTime(401);
      await body.updateComplete;
    });
    expect(body.querySelector('cds-loading')).toBe(spinner);
    expect(noticeCount()).toBe(1);
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  }
);

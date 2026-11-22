/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ChatContainer } from '../ChatContainer';
import { ChatCustomElement } from '../ChatCustomElement';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { chatStore } from '../../chat/services/attachChatView';

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
});

it.each([
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const)(
  '%s startup leaves focus on an outside control',
  async (_name, Wrapper) => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    let instance: ChatInstance;
    const beforeStates: boolean[] = [];
    const after = vi.fn();
    const view = render(
      React.createElement(Wrapper, {
        ...createBaseConfig(),
        className: '',
        openChatByDefault: false,
        onBeforeRender: (chat) => {
          instance = chat;
          beforeStates.push(
            chatStore(chat.serviceManager).getState().view
              .initialViewChangeComplete
          );
        },
        onAfterRender: after,
      })
    );
    try {
      // The first boot in a file loads the boot modules on demand.
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      expect(beforeStates).toEqual([false]);
      expect(
        chatStore(instance.serviceManager).getState().view
          .initialViewChangeComplete
      ).toBe(true);
      expect(document.activeElement).toBe(outside);
    } finally {
      view.unmount();
      outside.remove();
    }
  }
);

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
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

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
    const after = jest.fn();
    const view = render(
      React.createElement(Wrapper, {
        ...createBaseConfig(),
        className: '',
        openChatByDefault: false,
        onBeforeRender: (chat) => {
          instance = chat;
          beforeStates.push(
            chat.serviceManager.store.getState().initialViewChangeComplete
          );
        },
        onAfterRender: after,
      })
    );
    try {
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      expect(beforeStates).toEqual([false]);
      expect(
        instance.serviceManager.store.getState().initialViewChangeComplete
      ).toBe(true);
      expect(document.activeElement).toBe(outside);
    } finally {
      view.unmount();
      outside.remove();
    }
  }
);

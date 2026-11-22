/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Render-count regression guards for the re-render hardening work. Each test
 * mounts a probe subscribing through the REAL `useSelector` and asserts that a
 * given store change produces a minimal, targeted set of re-renders rather than
 * a tree-wide one. Deterministic counterpart to the live browser render trace.
 */

import React, { ReactElement } from 'react';
import { render, act } from '@testing-library/react';

import { useSelector } from '../hooks/useSelector';
import { selectMessagesState } from '../components-legacy/MessagesComponent';
import actions from '../../sdk/store/actions';
import { viewActions } from '../state';
import { shallowEqual } from '../../sdk/store/appStore';
import { PublicConfig } from '../../types/config/PublicConfig';
import { makeConfigStore, TestChatContext } from './helpers/chat';

const makeStore = makeConfigStore;

const BASE_CONFIG: PublicConfig = {
  header: { name: 'Assistant' },
  input: { isDisabled: false },
} as PublicConfig;

describe('render hardening', () => {
  // Regression for Fix 1: `selectMessagesState` used to map in the whole
  // `assistantInputState` slice (which it never read), so every keystroke —
  // an UPDATE_INPUT_STATE that replaces that slice — re-rendered the entire
  // message list. The dead field is gone, so a keystroke must NOT re-render a
  // subscriber to the bag.
  it('a keystroke does NOT re-render selectMessagesState subscribers', () => {
    const store = makeStore(BASE_CONFIG);
    let messageBagRenders = 0;

    function MessagesBagProbe(): ReactElement {
      useSelector(selectMessagesState, shallowEqual);
      messageBagRenders += 1;
      return null;
    }

    render(
      <TestChatContext store={store}>
        <MessagesBagProbe />
      </TestChatContext>
    );
    expect(messageBagRenders).toBe(1);

    // Two keystrokes (rawValue/content updates), exactly what Input.tsx
    // dispatches as the user types.
    act(() => {
      store.dispatch(
        actions.updateInputState(
          { rawValue: 'h', content: { type: 'doc', content: [] } },
          false
        )
      );
    });
    act(() => {
      store.dispatch(
        actions.updateInputState(
          { rawValue: 'hi', content: { type: 'doc', content: [] } },
          false
        )
      );
    });
    expect(messageBagRenders).toBe(1);

    // Sanity: a field the bag actually reads (the accepted disclaimers)
    // re-renders it. The list reads messages from public state now.
    act(() => {
      store.dispatch(viewActions.acceptDisclaimer());
    });
    expect(messageBagRenders).toBe(2);
  });
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { usePublicChatState } from '../../../src/chat/hooks/usePublicChatState';
import { ServiceManagerProvider } from '../../../src/chat/providers/ServiceManagerProvider';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { PublicChatState } from '../../../src/types/instance/PublicChatState';

function createStateSource(initialState: PublicChatState) {
  let state = initialState;
  const listeners = new Set<() => void>();
  const access = {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    select: jest.fn(),
  };
  return {
    access,
    update(nextState: PublicChatState) {
      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('usePublicChatState', () => {
  it('reads updates through the React 17-compatible selector shim', () => {
    const initialState = {
      status: 'ready',
      version: 'initial',
    } as unknown as PublicChatState;
    const source = createStateSource(initialState);
    const serviceManager = {
      instance: { state: source.access },
    } as unknown as ServiceManager;
    let renders = 0;

    function Status() {
      const status = usePublicChatState((state) => state.status);
      renders += 1;
      return <div data-testid="status">{status}</div>;
    }

    render(
      <ServiceManagerProvider serviceManager={serviceManager}>
        <Status />
      </ServiceManagerProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('ready');

    act(() => {
      source.update({
        ...initialState,
        version: 'unrelated',
      } as PublicChatState);
    });
    expect(renders).toBe(1);

    act(() => {
      source.update({
        ...initialState,
        status: 'streaming',
        version: 'streaming',
      } as PublicChatState);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('streaming');
    expect(renders).toBe(2);
  });

  it('uses a custom equality function for selected values', () => {
    const initialState = {
      status: 'ready',
      isMessageLoadingCounter: 0,
    } as unknown as PublicChatState;
    const source = createStateSource(initialState);
    const serviceManager = {
      instance: { state: source.access },
    } as unknown as ServiceManager;
    let renders = 0;

    function LoadingBucket() {
      const counter = usePublicChatState(
        (state) => state.isMessageLoadingCounter,
        (left, right) => Math.floor(left / 2) === Math.floor(right / 2)
      );
      renders += 1;
      return <div>{Math.floor(counter / 2)}</div>;
    }

    render(
      <ServiceManagerProvider serviceManager={serviceManager}>
        <LoadingBucket />
      </ServiceManagerProvider>
    );
    act(() => {
      source.update({
        ...initialState,
        isMessageLoadingCounter: 1,
      } as PublicChatState);
    });
    expect(renders).toBe(1);

    act(() => {
      source.update({
        ...initialState,
        isMessageLoadingCounter: 2,
      } as PublicChatState);
    });
    expect(renders).toBe(2);
  });
});

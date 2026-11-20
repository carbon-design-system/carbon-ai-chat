/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it.each([
  ['ready', 'ready', ['a']],
  ['hydrating', 'loading', ['a']],
  ['active requests', 'submitted', ['a', 'b']],
  ['active requests', 'submitted', ['b', 'a']],
  ['overlapping responses', 'streaming', ['a', 'b']],
  ['overlapping responses', 'streaming', ['b', 'a']],
] as const)(
  'keeps %s lifecycle ownership (%s) through loading overrides, completing %j',
  async (phase, status, [first, second]) => {
    const { instance, serviceManager, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const lifecycle = serviceManager.messageCoordinator;
    const generation = lifecycle.currentGeneration;
    act(() => {
      if (phase === 'hydrating') {
        lifecycle.hydrationStarted();
      } else if (phase === 'active requests') {
        lifecycle.requestStarted('request-a', generation);
        lifecycle.requestStarted('request-b', generation);
      } else if (phase === 'overlapping responses') {
        lifecycle.requestStarted('request-a', generation);
        lifecycle.responseStreaming('response-a', generation);
        lifecycle.responseStreaming('response-b', generation);
      }
    });
    expect(instance.state.get().status).toBe(status);
    const statusChanges: string[] = [];
    const unsubscribe = instance.state.select(
      (state) => state.status,
      (next) => statusChanges.push(next)
    );
    const applyOverride = (override: () => void) => {
      act(override);
      expect(instance.state.get().status).toBe(status);
      expect(lifecycle.currentGeneration).toBe(generation);
    };
    try {
      applyOverride(() => instance.updateIsMessageLoadingCounter('increase'));
      applyOverride(() =>
        instance.updateIsMessageLoadingCounter(undefined, 'Host progress')
      );
      expect(store.getState().assistantMessageState).toMatchObject({
        isMessageLoadingCounter: 1,
        isMessageLoadingText: 'Host progress',
      });
      applyOverride(() => instance.updateIsMessageLoadingCounter('decrease'));
      applyOverride(() => instance.updateIsMessageLoadingCounter('decrease'));
      applyOverride(() => instance.updateIsMessageLoadingCounter('reset'));
      applyOverride(() => instance.updateIsChatLoadingCounter('increase'));
      applyOverride(() => instance.updateIsChatLoadingCounter('reset'));
      applyOverride(() => instance.updateIsChatLoadingCounter('decrease'));
      applyOverride(() => instance.updateIsChatLoadingCounter('decrease'));
      expect(statusChanges).toEqual([]);
    } finally {
      unsubscribe();
    }

    if (phase === 'hydrating') {
      act(() => lifecycle.requestStarted('request-a', generation));
      expect(instance.state.get().status).toBe('loading');
      act(() => lifecycle.hydrationFinished(generation));
      expect(instance.state.get().status).toBe('submitted');
      act(() => lifecycle.requestFinished('request-a', generation));
    } else if (phase === 'active requests') {
      act(() => lifecycle.requestFinished(`request-${first}`, generation));
      expect(instance.state.get().status).toBe('submitted');
      act(() => lifecycle.requestFinished(`request-${second}`, generation));
    } else if (phase === 'overlapping responses') {
      act(() => lifecycle.responseFinished(`response-${first}`, generation));
      expect(instance.state.get().status).toBe('streaming');
      act(() => lifecycle.responseFinished(`response-${second}`, generation));
      expect(instance.state.get().status).toBe('submitted');
      act(() => lifecycle.requestFinished('request-a', generation));
    } else {
      act(() => lifecycle.requestStarted('request-a', generation));
      expect(instance.state.get().status).toBe('submitted');
      act(() => lifecycle.requestFinished('request-a', generation));
    }
    expect(instance.state.get().status).toBe('ready');
    expect(lifecycle.currentGeneration).toBe(generation);
  }
);

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
  ChatInstance,
  PublicChatState,
  ViewType,
  readCarbonChatSession,
} from '../../../../src/aiChatEntry';
import { contractChat, contractSetup } from '../../helpers';

/** A public change that touches no messaging field: the unread indicator. */
function showUnread(instance: ChatInstance, isVisible = true): void {
  act(() => instance.updateAssistantUnreadIndicatorVisibility(isVisible));
}

/** A public change with a counter a test can step: the loading counter. */
function increaseLoading(instance: ChatInstance): void {
  act(() => instance.updateIsMessageLoadingCounter('increase'));
}

/**
 * A call that changes the chat but no public state field: the input field's
 * visibility isn't in `PublicChatState`.
 */
function hideInputField(instance: ChatInstance): void {
  act(() => instance.updateInputFieldVisibility(false));
}

// @covers instance.state instance.state.get
describe('state.get', () => {
  contractSetup();

  it('reflects a change made through a public action', async () => {
    const { instance } = await contractChat();
    expect(instance.state.get().showUnreadIndicator).toBe(false);
    showUnread(instance);
    expect(instance.state.get().showUnreadIndicator).toBe(true);
  });

  // Identity is the documented contract here: "The same object is returned
  // until public state changes" (src/types/instance/ChatInstance.ts:35).
  it('returns the same object until public state changes', async () => {
    const { instance } = await contractChat();
    const first = instance.state.get();
    expect(instance.state.get()).toBe(first);
    hideInputField(instance);
    expect(instance.state.get()).toBe(first);
    showUnread(instance);
    expect(instance.state.get()).not.toBe(first);
  });

  it('keeps an older snapshot at its old values after a change', async () => {
    const { instance } = await contractChat();
    const before = instance.state.get();
    showUnread(instance);
    increaseLoading(instance);
    expect(before.showUnreadIndicator).toBe(false);
    expect(before.isMessageLoadingCounter).toBe(0);
  });

  it('includes every documented field', async () => {
    const { instance } = await contractChat();
    const documented: (keyof PublicChatState)[] = [
      'wasLoadedFromBrowser',
      'version',
      'viewState',
      'showUnreadIndicator',
      'launcherIsExpanded',
      'launcherShouldStartCallToActionCounterIfEnabled',
      'hasSentNonWelcomeMessage',
      'disclaimersAccepted',
      'homeScreenState',
      'messages',
      'status',
      'humanAgent',
      'isMessageLoadingCounter',
      'isMessageLoadingText',
      'isHydratingCounter',
      'activeResponseId',
      'input',
      'customPanels',
      'workspace',
    ];
    expect(Object.keys(instance.state.get())).toEqual(
      expect.arrayContaining(documented)
    );
    expect(Object.keys(instance.state.get())).not.toContain('humanAgentState');
  });

  // `PublicChatState` has no `history` field, but `main`'s snapshot carries
  // one, a copy of `customPanels.history` (src/chat/utils/publicState.ts:226).
  it('also carries an undocumented history field equal to customPanels.history', async () => {
    const { instance } = await contractChat();
    const state = instance.state.get() as PublicChatState & {
      history?: unknown;
    };
    expect(Object.keys(state)).toContain('history');
    expect(state.history).toEqual(state.customPanels.history);
  });
});

// @covers instance.state instance.state.get instance.getState
describe('snapshots are immutable', () => {
  contractSetup();

  it('freezes the snapshot and its nested state objects', async () => {
    const { instance } = await contractChat();
    const state = instance.state.get();
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.viewState)).toBe(true);
    expect(Object.isFrozen(state.homeScreenState)).toBe(true);
    expect(Object.isFrozen(state.disclaimersAccepted)).toBe(true);
    expect(Object.isFrozen(state.humanAgent)).toBe(true);
    expect(Object.isFrozen(state.input)).toBe(true);
    expect(Object.isFrozen(state.customPanels)).toBe(true);
    expect(Object.isFrozen(state.customPanels.history)).toBe(true);
    expect(Object.isFrozen(state.workspace)).toBe(true);
  });

  it('rejects a write to a snapshot and keeps its value', async () => {
    const { instance } = await contractChat();
    const state = instance.state.get();
    expect(() => {
      (state as { showUnreadIndicator: boolean }).showUnreadIndicator = true;
    }).toThrow();
    expect(() => {
      (state.viewState as { mainWindow: boolean }).mainWindow = true;
    }).toThrow();
    expect(state.showUnreadIndicator).toBe(false);
    expect(state.viewState.mainWindow).toBe(false);
    expect(instance.state.get().viewState.mainWindow).toBe(false);
  });

  it('freezes what the deprecated getState returns too', async () => {
    const { instance } = await contractChat();
    const state = instance.getState();
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.viewState)).toBe(true);
  });
});

// @covers instance.getState instance.state.get
describe('getState (deprecated)', () => {
  contractSetup();

  it('reads the same values as state.get', async () => {
    const { instance } = await contractChat();
    expect(instance.getState()).toEqual(instance.state.get());
    showUnread(instance);
    increaseLoading(instance);
    expect(instance.getState()).toEqual(instance.state.get());
    expect(instance.getState().showUnreadIndicator).toBe(true);
  });

  // Not in the JSDoc. While a change is being delivered to subscribers, a
  // nested change shows in getState() at once, but state.get() keeps the
  // snapshot being delivered until the nested change is delivered in turn.
  it('reads a nested change live while state.get keeps the snapshot being delivered', async () => {
    const { instance } = await contractChat();
    const reads: string[] = [];
    let nested = false;
    instance.state.subscribe(() => {
      if (!nested) {
        nested = true;
        instance.updateIsMessageLoadingCounter('increase');
        reads.push(`getState ${instance.getState().isMessageLoadingCounter}`);
        reads.push(`state.get ${instance.state.get().isMessageLoadingCounter}`);
      } else {
        reads.push(
          `next state.get ${instance.state.get().isMessageLoadingCounter}`
        );
      }
    });
    showUnread(instance);
    expect(reads).toEqual(['getState 1', 'state.get 0', 'next state.get 1']);
    expect(instance.state.get().isMessageLoadingCounter).toBe(1);
  });
});

// @covers instance.state instance.state.subscribe
describe('state.subscribe', () => {
  contractSetup();

  it('calls the listener once, with no arguments, after a public change', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
    showUnread(instance);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
  });

  it('lets the listener read the new state through state.get', async () => {
    const { instance } = await contractChat();
    const seen: boolean[] = [];
    instance.state.subscribe(() => {
      seen.push(instance.state.get().showUnreadIndicator);
    });
    showUnread(instance);
    showUnread(instance, false);
    expect(seen).toEqual([true, false]);
  });

  it('stops calling the listener after the returned function runs', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    const unsubscribe = instance.state.subscribe(listener);
    showUnread(instance);
    unsubscribe();
    showUnread(instance, false);
    increaseLoading(instance);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('calls every listener once per change', async () => {
    const { instance } = await contractChat();
    const first = jest.fn();
    const second = jest.fn();
    instance.state.subscribe(first);
    instance.state.subscribe(second);
    showUnread(instance);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('treats the same function subscribed twice as two subscriptions', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    const stopFirst = instance.state.subscribe(listener);
    instance.state.subscribe(listener);
    showUnread(instance);
    expect(listener).toHaveBeenCalledTimes(2);
    stopFirst();
    // Stopping the same subscription again changes nothing.
    stopFirst();
    showUnread(instance, false);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  // The JSDoc promises a call "after public state changes"; `main` also skips
  // the call when a change leaves every public field as it was.
  it('does not call the listener when no public field changed', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.subscribe(listener);
    hideInputField(instance);
    showUnread(instance, false);
    expect(listener).not.toHaveBeenCalled();
  });

  // Not in the JSDoc: `main` logs a listener's error and carries on.
  it('still calls other listeners, and completes the action, when one throws', async () => {
    const { instance } = await contractChat();
    const after = jest.fn();
    instance.state.subscribe(() => {
      throw new Error('listener failed');
    });
    instance.state.subscribe(after);
    expect(() => showUnread(instance)).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(instance.state.get().showUnreadIndicator).toBe(true);
  });
});

// @covers instance.state instance.state.select
describe('state.select', () => {
  contractSetup();

  it('does not call the listener with the current value', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.select((state) => state.showUnreadIndicator, listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('calls the listener with each changed selected value', async () => {
    const { instance } = await contractChat();
    const values: number[] = [];
    instance.state.select(
      (state) => state.isMessageLoadingCounter,
      (value) => values.push(value)
    );
    increaseLoading(instance);
    increaseLoading(instance);
    expect(values).toEqual([1, 2]);
  });

  it('calls the listener once when an action makes several public changes', async () => {
    const { instance } = await contractChat();
    const values: boolean[] = [];
    instance.state.select(
      (state) => state.viewState.mainWindow,
      (value) => values.push(value)
    );
    await act(() => instance.changeView(ViewType.MAIN_WINDOW));
    expect(values).toEqual([true]);
  });

  it('does not call the listener when another public field changes', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.select((state) => state.showUnreadIndicator, listener);
    increaseLoading(instance);
    expect(listener).not.toHaveBeenCalled();
  });

  // The default comparison is `Object.is`, so a selector that builds a new
  // object fires on every public change, even with equal contents.
  it('compares with Object.is by default', async () => {
    const { instance } = await contractChat();
    const values: unknown[] = [];
    instance.state.select(
      (state) => ({ counter: state.isMessageLoadingCounter }),
      (value) => values.push(value)
    );
    showUnread(instance);
    expect(values).toEqual([{ counter: 0 }]);
  });

  it('compares with isEqual when one is given', async () => {
    const { instance } = await contractChat();
    const values: number[] = [];
    instance.state.select(
      (state) => state.isMessageLoadingCounter,
      (value) => values.push(value),
      {
        isEqual: (left, right) =>
          Math.floor(left / 2) === Math.floor(right / 2),
      }
    );
    increaseLoading(instance);
    expect(values).toEqual([]);
    increaseLoading(instance);
    expect(values).toEqual([2]);
    increaseLoading(instance);
    expect(values).toEqual([2]);
  });

  it('stops calling the listener after the returned function runs', async () => {
    const { instance } = await contractChat();
    const values: number[] = [];
    const unsubscribe = instance.state.select(
      (state) => state.isMessageLoadingCounter,
      (value) => values.push(value)
    );
    increaseLoading(instance);
    unsubscribe();
    increaseLoading(instance);
    expect(values).toEqual([1]);
  });

  // Not in the JSDoc: `main` runs the selector once when select is called, so
  // a selector that throws then throws from select itself.
  it('throws from select when the selector throws on the first read', async () => {
    const { instance } = await contractChat();
    expect(() =>
      instance.state.select(() => {
        throw new Error('selector failed');
      }, jest.fn())
    ).toThrow('selector failed');
  });

  // Not in the JSDoc: `main` logs a later selector error, skips that change,
  // and keeps the selection.
  it('skips a change where the selector throws, and keeps selecting', async () => {
    const { instance } = await contractChat();
    const values: number[] = [];
    instance.state.select(
      (state) => {
        if (state.isMessageLoadingCounter === 1) {
          throw new Error('selector failed');
        }
        return state.isMessageLoadingCounter;
      },
      (value) => values.push(value)
    );
    expect(() => increaseLoading(instance)).not.toThrow();
    increaseLoading(instance);
    expect(values).toEqual([2]);
  });
});

// @covers state.version
describe('state.version', () => {
  contractSetup();

  // The package build replaces `process.env.VERSION` with package.json's
  // version (without a prerelease tag). Under Jest the source runs unbundled,
  // so both sides are `undefined` here, though the field is typed `string`
  // (src/chat/utils/environmentVariables.ts:10).
  it('matches the build version and the saved session readCarbonChatSession returns', async () => {
    const { instance } = await contractChat();
    showUnread(instance);
    const session = readCarbonChatSession();
    expect(session).not.toBeNull();
    expect(session.showUnreadIndicator).toBe(true);
    expect(instance.state.get().version).toBe(session.version);
    expect(instance.state.get().version).toBe(process.env.VERSION);
  });
});

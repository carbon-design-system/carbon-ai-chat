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
import {
  changeView,
  contractChat,
  contractSetup,
  showUnread,
} from '../../helpers';

/** A public change with a counter a test can step: the loading counter. */
async function increaseLoading(instance: ChatInstance): Promise<void> {
  await act(async () => {
    instance.updateIsMessageLoadingCounter('increase');
  });
}

// @covers instance.state instance.state.get
describe('state.get', () => {
  contractSetup();

  it('reflects a change made through a public action', async () => {
    const { instance } = await contractChat();
    expect(instance.state.get().showUnreadIndicator).toBe(false);
    await showUnread(instance);
    expect(instance.state.get().showUnreadIndicator).toBe(true);
  });

  // Identity is the documented contract here: "The same object is returned
  // until public state changes" (src/types/instance/ChatInstance.ts:35).
  it('returns the same object until public state changes', async () => {
    const { instance } = await contractChat();
    const first = instance.state.get();
    expect(instance.state.get()).toBe(first);
    // Hiding an indicator that is already hidden changes no public field.
    await showUnread(instance, false);
    expect(instance.state.get()).toBe(first);
    await showUnread(instance);
    expect(instance.state.get()).not.toBe(first);
  });

  it('keeps an older snapshot at its old values after a change', async () => {
    const { instance } = await contractChat();
    const before = instance.state.get();
    await showUnread(instance);
    await increaseLoading(instance);
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
    await showUnread(instance);
    await increaseLoading(instance);
    expect(instance.getState()).toEqual(instance.state.get());
    expect(instance.getState().showUnreadIndicator).toBe(true);
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
    await showUnread(instance);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
  });

  it('lets the listener read the new state through state.get', async () => {
    const { instance } = await contractChat();
    const seen: boolean[] = [];
    instance.state.subscribe(() => {
      seen.push(instance.state.get().showUnreadIndicator);
    });
    await showUnread(instance);
    await showUnread(instance, false);
    expect(seen).toEqual([true, false]);
  });

  it('stops calling the listener after the returned function runs', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    const unsubscribe = instance.state.subscribe(listener);
    await showUnread(instance);
    unsubscribe();
    await showUnread(instance, false);
    await increaseLoading(instance);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('calls every listener once per change', async () => {
    const { instance } = await contractChat();
    const first = jest.fn();
    const second = jest.fn();
    instance.state.subscribe(first);
    instance.state.subscribe(second);
    await showUnread(instance);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('treats the same function subscribed twice as two subscriptions', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    const stopFirst = instance.state.subscribe(listener);
    instance.state.subscribe(listener);
    await showUnread(instance);
    expect(listener).toHaveBeenCalledTimes(2);
    stopFirst();
    // Stopping the same subscription again changes nothing.
    stopFirst();
    await showUnread(instance, false);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  // The JSDoc promises a call "after public state changes"; `main` also skips
  // the call when a change leaves every public field as it was.
  it('does not call the listener when no public field changed', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.subscribe(listener);
    // The indicator is already hidden, so hiding it changes no public field.
    await showUnread(instance, false);
    expect(listener).not.toHaveBeenCalled();
  });

  // Not in the JSDoc: `main` logs a listener's error and carries on
  // (MAIN-NOTES M39).
  it('still calls other listeners, and completes the action, when one throws', async () => {
    const { instance } = await contractChat();
    const after = jest.fn();
    instance.state.subscribe(() => {
      throw new Error('listener failed');
    });
    instance.state.subscribe(after);
    await expect(showUnread(instance)).resolves.toBeUndefined();
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
    await increaseLoading(instance);
    await increaseLoading(instance);
    expect(values).toEqual([1, 2]);
  });

  it('calls the listener once for a changeView that opens the main window', async () => {
    const { instance } = await contractChat();
    const values: boolean[] = [];
    instance.state.select(
      (state) => state.viewState.mainWindow,
      (value) => values.push(value)
    );
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(values).toEqual([true]);
  });

  it('does not call the listener when another public field changes', async () => {
    const { instance } = await contractChat();
    const listener = jest.fn();
    instance.state.select((state) => state.showUnreadIndicator, listener);
    await increaseLoading(instance);
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
    await showUnread(instance);
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
    await increaseLoading(instance);
    expect(values).toEqual([]);
    await increaseLoading(instance);
    expect(values).toEqual([2]);
    await increaseLoading(instance);
    expect(values).toEqual([2]);
  });

  it('stops calling the listener after the returned function runs', async () => {
    const { instance } = await contractChat();
    const values: number[] = [];
    const unsubscribe = instance.state.select(
      (state) => state.isMessageLoadingCounter,
      (value) => values.push(value)
    );
    await increaseLoading(instance);
    unsubscribe();
    await increaseLoading(instance);
    expect(values).toEqual([1]);
  });

  // Not in the JSDoc (MAIN-NOTES M39): when the selector throws on a change,
  // `main` logs the error, skips that change, and keeps the selection.
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
    await expect(increaseLoading(instance)).resolves.toBeUndefined();
    await increaseLoading(instance);
    expect(values).toEqual([2]);
  });
});

// @covers export.aiChatEntry.readCarbonChatSession
describe('readCarbonChatSession', () => {
  contractSetup();

  it('returns null before a chat saves a session, then the latest saved view and indicator', async () => {
    expect(readCarbonChatSession()).toBeNull();
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(readCarbonChatSession().viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
    await changeView(instance, ViewType.LAUNCHER);
    await showUnread(instance);
    const session = readCarbonChatSession();
    expect(session.viewState).toEqual({ launcher: true, mainWindow: false });
    expect(session.showUnreadIndicator).toBe(true);
  });
});

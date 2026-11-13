/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';

import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewChangeReason,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  pause,
  recordEvents,
  showUnread,
} from '../../helpers';

const VIEW_EVENTS = [BusEventType.VIEW_PRE_CHANGE, BusEventType.VIEW_CHANGE];

/** The two call-to-action fields a host reads. */
function callToAction(instance: ChatInstance) {
  const state = instance.getState();
  return {
    expanded: state.launcherIsExpanded,
    counter: state.launcherShouldStartCallToActionCounterIfEnabled,
  };
}

// @covers state.viewState.launcher state.viewState.mainWindow
// @covers event.view:pre:change event.view:change config.launcher.isOn
describe('launcher', () => {
  contractSetup();

  it('opens the main window when clicked, with LAUNCHER_CLICKED', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const events = recordEvents(instance, VIEW_EVENTS);
    await click(getByTestId(PageObjectId.LAUNCHER));
    await waitFor(() =>
      expect(instance.getState().viewState).toEqual({
        launcher: false,
        mainWindow: true,
      })
    );
    expect(events.types()).toEqual([
      BusEventType.VIEW_PRE_CHANGE,
      BusEventType.VIEW_CHANGE,
    ]);
    for (const event of events.events as BusEventViewPreChange[]) {
      expect(event.reason).toBe(ViewChangeReason.LAUNCHER_CLICKED);
      expect(event.oldViewState).toEqual({ launcher: true, mainWindow: false });
      expect(event.newViewState).toEqual({ launcher: false, mainWindow: true });
    }
  });

  it('is drawn only while viewState.launcher is true', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    expect(byTestId(PageObjectId.LAUNCHER)).not.toBeNull();
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
    await changeView(instance, ViewType.LAUNCHER);
    expect(byTestId(PageObjectId.LAUNCHER)).not.toBeNull();
  });

  // MAIN-NOTES M26 (2.0.0): the emitted literal differs from the enum value.
  it('comes back from the header close button, with the snake_case reason', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const events = recordEvents(instance, VIEW_EVENTS);
    await click(getByTestId(PageObjectId.CLOSE_CHAT));
    await waitFor(() =>
      expect(instance.getState().viewState).toEqual({
        launcher: true,
        mainWindow: false,
      })
    );
    expect(events.types()).toEqual([
      BusEventType.VIEW_PRE_CHANGE,
      BusEventType.VIEW_CHANGE,
    ]);
    for (const event of events.events as BusEventViewChange[]) {
      expect(ViewChangeReason.MAIN_WINDOW_MINIMIZED).toBe(
        'mainWindowMinimized'
      );
      expect(event.reason).toBe('main_window_minimized');
      expect(event.oldViewState).toEqual({ launcher: false, mainWindow: true });
    }
  });

  it('is not drawn when launcher.isOn is false, though viewState.launcher is true', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      launcher: { isOn: false },
    });
    expect(instance.getState().viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
    expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
  });
});

/** A desktop call to action that expands after `timeToExpand` ms. */
function desktopCallToAction(timeToExpand: number): Partial<PublicConfig> {
  return {
    messaging: { skipWelcome: true },
    launcher: { desktop: { isOn: true, timeToExpand } },
  };
}

// @covers state.launcherIsExpanded
// @covers state.launcherShouldStartCallToActionCounterIfEnabled
// @covers config.launcher.desktop
describe('launcher call to action', () => {
  contractSetup();

  it('starts not expanded, with the counter flag set', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    expect(callToAction(instance)).toEqual({ expanded: false, counter: true });
  });

  it('does not expand on its own when no call to action is on', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    await pause(100);
    expect(callToAction(instance)).toEqual({ expanded: false, counter: true });
  });

  it('does not expand before desktop.timeToExpand', async () => {
    const { instance } = await contractChat(desktopCallToAction(60_000));
    await pause(100);
    expect(callToAction(instance)).toEqual({ expanded: false, counter: true });
  });

  it('expands after desktop.timeToExpand and clears the counter flag', async () => {
    const { instance } = await contractChat(desktopCallToAction(10));
    await waitFor(() =>
      expect(callToAction(instance)).toEqual({ expanded: true, counter: false })
    );
  });

  it('collapses when the launcher is clicked', async () => {
    const { instance } = await contractChat(desktopCallToAction(10));
    await waitFor(() => expect(callToAction(instance).expanded).toBe(true));
    await click(getByTestId(PageObjectId.LAUNCHER));
    await waitFor(() =>
      expect(callToAction(instance)).toEqual({
        expanded: false,
        counter: false,
      })
    );
    expect(instance.getState().viewState.mainWindow).toBe(true);
  });

  it('stays expanded when changeView opens the main window', async () => {
    const { instance } = await contractChat(desktopCallToAction(10));
    await waitFor(() => expect(callToAction(instance).expanded).toBe(true));
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause(50);
    // `main` differs from the launcher's own docs (MAIN-NOTES M27): its
    // "collapse when the main window opens some other way" effect never runs
    // here, because ViewType.MAIN_WINDOW hides the launcher, which unmounts
    // before the effect can see the open window.
    expect(callToAction(instance)).toEqual({ expanded: true, counter: false });
  });

  it('resets both flags to false on a remount in the same session', async () => {
    const first = await contractChat(desktopCallToAction(10));
    await waitFor(() =>
      expect(callToAction(first.instance)).toEqual({
        expanded: true,
        counter: false,
      })
    );
    first.unmount();
    const { instance } = await contractChat(desktopCallToAction(10));
    await pause(100);
    expect(callToAction(instance)).toEqual({ expanded: false, counter: false });
  });
});

// @covers state.showUnreadIndicator config.launcher.showUnreadIndicator
// @covers instance.updateAssistantUnreadIndicatorVisibility
describe('unread indicator', () => {
  contractSetup();

  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    // The deprecated method logs a warning on every call.
    consoleWarn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleWarn.mockRestore();
  });

  async function mount(showUnreadIndicator?: boolean) {
    return contractChat({
      messaging: { skipWelcome: true },
      launcher:
        showUnreadIndicator === undefined ? undefined : { showUnreadIndicator },
    });
  }

  it('is false by default', async () => {
    const { instance } = await mount();
    expect(instance.getState().showUnreadIndicator).toBe(false);
  });

  it('starts as launcher.showUnreadIndicator says', async () => {
    const { instance } = await mount(true);
    expect(instance.getState().showUnreadIndicator).toBe(true);
  });

  it('follows updateAssistantUnreadIndicatorVisibility', async () => {
    const { instance } = await mount();
    await showUnread(instance);
    expect(instance.getState().showUnreadIndicator).toBe(true);
    await showUnread(instance, false);
    expect(instance.getState().showUnreadIndicator).toBe(false);
  });

  it('clears when the main window opens', async () => {
    const { instance } = await mount(true);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(instance.getState().showUnreadIndicator).toBe(false);
  });

  it('stays set when set while the main window is open, through closing it', async () => {
    const { instance } = await mount();
    await changeView(instance, ViewType.MAIN_WINDOW);
    await showUnread(instance);
    expect(instance.getState().showUnreadIndicator).toBe(true);
    await changeView(instance, ViewType.LAUNCHER);
    expect(instance.getState().showUnreadIndicator).toBe(true);
  });

  it('follows a new launcher.showUnreadIndicator on rerender', async () => {
    const { instance, rerender } = await mount(true);
    await rerender({
      messaging: { skipWelcome: true },
      launcher: { showUnreadIndicator: false },
    });
    expect(instance.getState().showUnreadIndicator).toBe(false);
    await rerender({
      messaging: { skipWelcome: true },
      launcher: { showUnreadIndicator: true },
    });
    expect(instance.getState().showUnreadIndicator).toBe(true);
  });
});

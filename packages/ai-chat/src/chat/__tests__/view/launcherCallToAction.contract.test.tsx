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
  PageObjectId,
  ViewType,
  type ChatContainerProps,
  type ChatInstance,
} from '../../../aiChatEntry';
import {
  advance,
  byTestId,
  changeView,
  contractChat,
  contractSetup,
  getByTestId,
  shownText,
  type ContractMount,
} from '../helpers/contract';

/** How long the desktop call to action waits before it expands. */
const TIME_TO_EXPAND = 10_000;

/**
 * Fakes only `setTimeout`, which owns the call to action's wait. Installed
 * after the mount and before the host turns the call to action on, so the
 * wait starts on the test's clock.
 */
function controlTimeouts(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

/** A closed chat whose desktop call to action is on or off. */
function launcherProps(
  isOn: boolean,
  greeting = 'Owned launcher greeting'
): Partial<ChatContainerProps> {
  return {
    messaging: { skipWelcome: true },
    strings: { launcher_desktopGreeting: greeting },
    launcher: { desktop: { isOn, timeToExpand: TIME_TO_EXPAND } },
  };
}

/** The two call-to-action fields a host reads. */
function callToAction(instance: ChatInstance) {
  const state = instance.getState();
  return {
    expanded: state.launcherIsExpanded,
    counter: state.launcherShouldStartCallToActionCounterIfEnabled,
  };
}

/**
 * Mounts a closed chat with the call to action off, then turns it on, so its
 * wait starts now on the test's clock.
 */
async function startCallToAction(): Promise<ContractMount> {
  const mount = await contractChat(launcherProps(false));
  controlTimeouts();
  await mount.rerender(launcherProps(true));
  await advance(0);
  expect(callToAction(mount.instance)).toEqual({
    expanded: false,
    counter: true,
  });
  return mount;
}

describe('public launcher call to action', () => {
  contractSetup();

  it('expands at its original deadline through a launcher update and unrelated chat activity', async () => {
    const mount = await startCallToAction();
    const { instance } = mount;
    try {
      await advance(TIME_TO_EXPAND / 2);
      // Activity that redraws the launcher, and activity that doesn't.
      await mount.rerender(launcherProps(true, 'Owned updated greeting'));
      await act(async () => {
        instance.updateIsMessageLoadingCounter('increase');
        window.dispatchEvent(new Event('resize'));
      });

      await advance(TIME_TO_EXPAND / 2 - 1);
      expect(callToAction(instance)).toEqual({
        expanded: false,
        counter: true,
      });
      await advance(1);
      expect(callToAction(instance)).toEqual({
        expanded: true,
        counter: false,
      });
      expect(shownText(getByTestId(PageObjectId.LAUNCHER))).toContain(
        'Owned updated greeting'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('waits while the main window is open, then expands a full wait after the launcher returns', async () => {
    const mount = await startCallToAction();
    const { instance } = mount;
    try {
      await advance(TIME_TO_EXPAND / 2);
      await changeView(instance, ViewType.MAIN_WINDOW);
      await advance(2 * TIME_TO_EXPAND);
      // The open main window replaces the launcher, and nothing expands.
      expect(byTestId(PageObjectId.LAUNCHER)).toBeNull();
      expect(callToAction(instance)).toEqual({
        expanded: false,
        counter: true,
      });

      await changeView(instance, ViewType.LAUNCHER);
      expect(getByTestId(PageObjectId.LAUNCHER)).not.toBeNull();
      await advance(TIME_TO_EXPAND - 1);
      expect(callToAction(instance)).toEqual({
        expanded: false,
        counter: true,
      });
      await advance(1);
      expect(callToAction(instance)).toEqual({
        expanded: true,
        counter: false,
      });
    } finally {
      await act(async () => mount.unmount());
    }
  });
});

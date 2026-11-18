/**
 * @jest-environment-options {"userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"}
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["jest-environment-options"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// The chat decides whether it runs on a phone once, from the user agent, when
// it loads, so this file runs under a phone's user agent (the docblock above).

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  pause,
  shownText,
} from '../../helpers';

/** The two call-to-action fields a host reads. */
function callToAction(instance: ChatInstance) {
  const state = instance.getState();
  return {
    expanded: state.launcherIsExpanded,
    counter: state.launcherShouldStartCallToActionCounterIfEnabled,
  };
}

function withLauncher(launcher: PublicConfig['launcher']) {
  return contractChat({ messaging: { skipWelcome: true }, launcher });
}

// @covers config.launcher config.launcher.mobile state.launcherIsExpanded
// @covers state.launcherShouldStartCallToActionCounterIfEnabled
describe('launcher.mobile on a phone', () => {
  contractSetup();

  it('expands after mobile.timeToExpand and clears the counter flag', async () => {
    const { instance } = await withLauncher({
      mobile: { isOn: true, timeToExpand: 10 },
    });
    await waitFor(() =>
      expect(callToAction(instance)).toEqual({ expanded: true, counter: false })
    );
  });

  it('does not expand before mobile.timeToExpand', async () => {
    const { instance } = await withLauncher({
      mobile: { isOn: true, timeToExpand: 60_000 },
    });
    await pause(100);
    expect(callToAction(instance)).toEqual({ expanded: false, counter: true });
  });

  it('ignores launcher.desktop', async () => {
    const { instance } = await withLauncher({
      desktop: { isOn: true, timeToExpand: 10 },
    });
    await pause(100);
    expect(callToAction(instance)).toEqual({ expanded: false, counter: true });
  });

  it('shows mobile.title in the expanded launcher', async () => {
    const { instance } = await withLauncher({
      mobile: { isOn: true, timeToExpand: 10, title: 'Contract mobile title' },
      desktop: { title: 'Contract desktop title' },
    });
    await waitFor(() => expect(callToAction(instance).expanded).toBe(true));
    const text = shownText(getByTestId(PageObjectId.LAUNCHER));
    expect(text).toContain('Contract mobile title');
    expect(text).not.toContain('Contract desktop title');
  });

  it('opens the main window when the expanded launcher is clicked', async () => {
    const { instance } = await withLauncher({
      mobile: { isOn: true, timeToExpand: 10 },
    });
    await waitFor(() => expect(callToAction(instance).expanded).toBe(true));
    await click(getByTestId(PageObjectId.LAUNCHER));
    await waitFor(() =>
      expect(instance.getState().viewState.mainWindow).toBe(true)
    );
  });
});

// @covers instance.requestFocus
describe('focus on a phone', () => {
  contractSetup();

  it('never moves focus: requestFocus returns false with the main window open', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    let result: boolean | void;
    await act(async () => {
      result = instance.requestFocus();
    });
    expect(result).toBe(false);
  });
});

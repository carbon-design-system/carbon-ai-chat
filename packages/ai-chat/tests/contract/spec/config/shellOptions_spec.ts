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
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  changeView,
  contractChat,
  contractSetup,
  getByTestId,
  imagesNamed,
  pause,
  shownText,
  textResponse,
} from '../../helpers';

// @covers config.namespace
describe('namespace', () => {
  contractSetup();

  const STRINGS = {
    window_ariaChatRegion: 'Contract region',
    window_ariaChatRegionNamespace: 'Contract region {namespace}',
  };

  async function mount(namespace?: string) {
    return contractChat({
      namespace,
      strings: STRINGS,
      messaging: { skipWelcome: true },
    });
  }

  it('names the chat region with the namespace', async () => {
    await mount('north');
    expect(allByRole('region', 'Contract region north')).toHaveLength(1);
  });

  it('names the chat region without a namespace when none is set', async () => {
    await mount();
    expect(allByRole('region', 'Contract region')).toHaveLength(1);
  });

  it('keeps each namespace’s open view apart in the same session', async () => {
    const north = await mount('north');
    await changeView(north.instance, ViewType.MAIN_WINDOW);
    north.unmount();

    const south = await mount('south');
    expect(south.instance.getState().viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
    south.unmount();

    const northAgain = await mount('north');
    expect(northAgain.instance.getState().viewState).toEqual({
      launcher: false,
      mainWindow: true,
    });
  });

  it('accepts a namespace longer than 30 characters', async () => {
    // `main` doesn't enforce the 30-character limit its JSDoc states; the
    // whole value is used.
    const long = 'a-namespace-well-over-thirty-characters';
    await mount(long);
    expect(allByRole('region', `Contract region ${long}`)).toHaveLength(1);
  });
});

/** Mounts an open chat with this config and adds one reply. */
async function openWithReply(
  config: Partial<PublicConfig>
): Promise<ChatInstance> {
  const { instance } = await contractChat({
    ...config,
    messaging: { skipWelcome: true },
  });
  await changeView(instance, ViewType.MAIN_WINDOW);
  await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
  return instance;
}

/** The time a reply's label shows, read through a label the test owns. */
function replyTime(): string {
  const text = shownText(getByTestId(PageObjectId.MAIN_PANEL));
  const match = /Said at ([^|]+)\|/.exec(text);
  if (!match) {
    throw new Error('no reply label shows');
  }
  return match[1].trim();
}

// @covers config.locale
describe('locale', () => {
  contractSetup();

  const STRINGS = { message_labelAssistant: 'Said at {timestamp}|' };

  it('writes a reply’s time in English style by default', async () => {
    await openWithReply({ strings: STRINGS });
    expect(replyTime()).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('writes a reply’s time in the locale’s style', async () => {
    await openWithReply({ strings: STRINGS, locale: 'fr' });
    expect(replyTime()).toMatch(/^\d{2}:\d{2}$/);
  });

  it('falls back to English style for a locale it has no data for', async () => {
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await openWithReply({ strings: STRINGS, locale: 'zz' });
      expect(replyTime()).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    } finally {
      error.mockRestore();
    }
  });
});

// @covers config.assistantAvatarUrl config.hideAvatar
describe('assistant avatar', () => {
  contractSetup();

  const STRINGS = { agent_ariaGenericAssistantAvatar: 'Contract avatar' };
  const URL = 'https://example.test/contract-avatar.png';

  it('shows assistantAvatarUrl as the reply’s avatar image', async () => {
    await openWithReply({ strings: STRINGS, assistantAvatarUrl: URL });
    const images = imagesNamed(STRINGS.agent_ariaGenericAssistantAvatar);
    expect(images.map((image) => image.getAttribute('src'))).toEqual([URL]);
  });

  it('shows one avatar image per reply', async () => {
    const instance = await openWithReply({
      strings: STRINGS,
      assistantAvatarUrl: URL,
    });
    await act(() => instance.messaging.addMessage(textResponse('Bye', 'r2')));
    expect(imagesNamed(STRINGS.agent_ariaGenericAssistantAvatar)).toHaveLength(
      2
    );
  });

  it('shows no avatar image with hideAvatar', async () => {
    await openWithReply({
      strings: STRINGS,
      assistantAvatarUrl: URL,
      hideAvatar: true,
    });
    expect(imagesNamed(STRINGS.agent_ariaGenericAssistantAvatar)).toEqual([]);
    // The reply itself still shows.
    expect(shownText(getByTestId(PageObjectId.MAIN_PANEL))).toContain('Hi');
  });
});

// @covers config.launcher config.launcher.mobile
describe('launcher.mobile on a desktop', () => {
  contractSetup();

  it('is ignored: a mobile call to action never expands the launcher', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
      launcher: { mobile: { isOn: true, timeToExpand: 10 } },
    });
    await pause(100);
    expect(instance.getState().launcherIsExpanded).toBe(false);
    expect(
      instance.getState().launcherShouldStartCallToActionCounterIfEnabled
    ).toBe(true);
  });
});

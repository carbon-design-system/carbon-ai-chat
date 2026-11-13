/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  HomeScreenConfig,
  MessageSendSource,
  PageObjectId,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractSetup,
  getByTestId,
  isHidden,
  isShownWithin,
  openChat,
  shownText,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  homeScreen_returnToHome: 'Contract back to home',
  homeScreen_overflowMenuHomeScreen: 'Contract home entry',
};

const GREETING = 'Contract greeting';

const STARTERS = {
  isOn: true,
  buttons: [{ label: 'Starter one' }, { label: 'Starter two' }],
};

/** Opens a chat with the home screen on and these home-screen fields. */
async function openHomeScreen(
  homescreen: Partial<HomeScreenConfig> = {},
  config: Parameters<typeof openChat>[0] = {}
) {
  return openChat({
    ...config,
    homescreen: { isOn: true, ...homescreen },
    strings: STRINGS,
  });
}

/** The text the home screen shows, with whitespace collapsed. */
function homeScreenText(): string {
  return shownText(getByTestId(PageObjectId.HOME_SCREEN_PANEL)).replace(
    /\s+/g,
    ' '
  );
}

/** Waits until the home screen has closed. */
async function waitForConversation(instance: ChatInstance): Promise<void> {
  await waitFor(() =>
    expect(instance.state.get().homeScreenState.isHomeScreenOpen).toBe(false)
  );
}

// @covers config.homescreen config.homescreen.greeting
describe('homescreen.greeting', () => {
  contractSetup();

  it('shows the greeting on the home screen', async () => {
    await openHomeScreen({ greeting: GREETING });
    expect(homeScreenText()).toContain(GREETING);
  });
});

// @covers config.homescreen config.homescreen.starters
describe('homescreen.starters', () => {
  contractSetup();

  it('shows one button per starter, labeled with its label', async () => {
    await openHomeScreen({ greeting: GREETING, starters: STARTERS });
    expect(allByRole('button', 'Starter one')).toHaveLength(1);
    expect(allByRole('button', 'Starter two')).toHaveLength(1);
    expect(
      isShownWithin(
        byRole('button', 'Starter two'),
        getByTestId(PageObjectId.HOME_SCREEN_PANEL)
      )
    ).toBe(true);
  });

  it('sends the starter label as the user message, from homeScreenStarter, and leaves the home screen', async () => {
    const { instance, backend } = await openHomeScreen({
      greeting: GREETING,
      starters: STARTERS,
    });
    await click(byRole('button', 'Starter two'));
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    const [sent] = backend.requests;
    expect(sent.request.input.text).toBe('Starter two');
    expect(sent.options.busEventSend.source).toBe(
      MessageSendSource.HOME_SCREEN_STARTER
    );
    await waitForConversation(instance);
  });

  it('shows no starter buttons with starters.isOn false', async () => {
    await openHomeScreen({
      greeting: GREETING,
      starters: { ...STARTERS, isOn: false },
    });
    expect(homeScreenText()).toContain(GREETING);
    expect(allByRole('button', 'Starter one')).toHaveLength(0);
    expect(allByRole('button', 'Starter two')).toHaveLength(0);
  });
});

// @covers config.homescreen config.homescreen.customContentOnly
// @covers writeable-element.homeScreenAfterStartersElement
describe('homescreen.customContentOnly', () => {
  contractSetup();

  it('shows neither the greeting nor the starters', async () => {
    await openHomeScreen({
      greeting: GREETING,
      starters: STARTERS,
      customContentOnly: true,
    });
    expect(homeScreenText()).not.toContain(GREETING);
    expect(allByRole('button', 'Starter one')).toHaveLength(0);
  });

  it('still shows host content written into homeScreenAfterStartersElement', async () => {
    const { instance } = await openHomeScreen({
      greeting: GREETING,
      starters: STARTERS,
      customContentOnly: true,
    });
    const span = document.createElement('span');
    span.textContent = 'Contract home content';
    await act(async () => {
      instance.writeableElements.homeScreenAfterStartersElement.append(span);
    });
    expect(
      isShownWithin(span, getByTestId(PageObjectId.HOME_SCREEN_PANEL))
    ).toBe(true);
    expect(isHidden(span)).toBe(false);
  });
});

// @covers config.homescreen config.homescreen.disableReturn
// @covers state.homeScreenState.isHomeScreenOpen
describe('homescreen.disableReturn', () => {
  contractSetup();

  it('still shows the home screen on first open', async () => {
    const { instance } = await openHomeScreen({
      greeting: GREETING,
      disableReturn: true,
    });
    expect(instance.state.get().homeScreenState.isHomeScreenOpen).toBe(true);
    expect(homeScreenText()).toContain(GREETING);
  });

  it('offers no way back to the home screen once a message is sent', async () => {
    const { instance } = await openHomeScreen({
      greeting: GREETING,
      disableReturn: true,
    });
    await act(() => instance.send('hello'));
    await waitForConversation(instance);
    expect(allByRole('button', STRINGS.homeScreen_returnToHome)).toHaveLength(
      0
    );
  });

  it('leaves the home screen entry out of the overflow menu', async () => {
    const { instance } = await openHomeScreen(
      { greeting: GREETING, disableReturn: true },
      { header: { menuOptions: [{ text: 'Option A', handler: () => {} }] } }
    );
    await act(() => instance.send('hello'));
    await waitForConversation(instance);
    expect(allByRole('menuitem', 'Option A')).toHaveLength(1);
    expect(
      allByRole('menuitem', STRINGS.homeScreen_overflowMenuHomeScreen)
    ).toHaveLength(0);
  });
});

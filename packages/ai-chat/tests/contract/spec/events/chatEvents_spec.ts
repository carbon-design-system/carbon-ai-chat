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
  BusEventHeaderMenuClick,
  BusEventType,
  ChatContainerProps,
  ChatInstance,
  HeaderMenuClickType,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  recordEvents,
  shownText,
  textResponse,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  header_overflowMenu_options: 'Contract menu',
  homeScreen_overflowMenuHomeScreen: 'Contract home entry',
  homeScreen_returnToHome: 'Contract back',
};

/**
 * Mounts a chat with the test strings, opens the main window, and leaves the
 * home screen (a response closes it), so the header shows its navigation.
 */
async function openConversation(config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  await act(() =>
    mount.instance.messaging.addMessage(textResponse('Hi', 'r1'))
  );
  return mount;
}

function menuClicks(
  events: ReturnType<typeof recordEvents>,
  clickType?: HeaderMenuClickType
): BusEventHeaderMenuClick[] {
  return events
    .of<BusEventHeaderMenuClick>(BusEventType.HEADER_MENU_CLICK)
    .filter((event) => !clickType || event.clickType === clickType);
}

/** A click event's host-visible fields. */
function summary(event: BusEventHeaderMenuClick) {
  return {
    clickType: event.clickType,
    menuItemIndex: event.menuItemIndex,
    menuItemText: event.menuItemText,
  };
}

// @covers event.header:menuClick config.header.menuOptions config.homescreen.isOn
describe('header:menuClick from the overflow menu', () => {
  contractSetup();

  it('fires overflowMenuOpened, with no index or text, when the user opens the menu', async () => {
    const { instance } = await openConversation({
      header: { menuOptions: [{ text: 'Option A', handler: () => {} }] },
    });
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(byRole('button', STRINGS.header_overflowMenu_options));
    expect(menuClicks(events).map(summary)).toEqual([
      {
        clickType: HeaderMenuClickType.OVERFLOW_MENU_OPENED,
        menuItemIndex: undefined,
        menuItemText: undefined,
      },
    ]);
  });

  it('fires overflowMenuItem with the index and text, then calls only that option handler', async () => {
    const order: string[] = [];
    const handlerA = jest.fn(() => order.push('handler A'));
    const handlerB = jest.fn(() => order.push('handler B'));
    const { instance } = await openConversation({
      header: {
        menuOptions: [
          { text: 'Option A', handler: handlerA, testId: 'contract-a' },
          { text: 'Option B', handler: handlerB, testId: 'contract-b' },
        ],
      },
    });
    instance.on({
      type: BusEventType.HEADER_MENU_CLICK,
      handler: (event: BusEventHeaderMenuClick) => order.push(event.clickType),
    });
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(getByTestId('contract-b'));
    // Only the item event is pinned. In jsdom the item's click also bubbles to
    // the menu button, which fires a second, overflowMenuOpened event; whether
    // a browser does the same is unverified (MAIN-NOTES M46).
    expect(
      menuClicks(events, HeaderMenuClickType.OVERFLOW_MENU_ITEM).map(summary)
    ).toEqual([
      {
        clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
        menuItemIndex: 1,
        menuItemText: 'Option B',
      },
    ]);
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(order.indexOf('overflowMenuItem')).toBeLessThan(
      order.indexOf('handler B')
    );
  });

  it('counts the built-in home screen entry first, so custom options shift by one', async () => {
    const handler = jest.fn();
    const { instance } = await openConversation({
      homescreen: { isOn: true, greeting: 'Welcome' },
      header: {
        menuOptions: [{ text: 'Option A', handler, testId: 'contract-a' }],
      },
    });
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(getByTestId('contract-a'));
    expect(
      menuClicks(events, HeaderMenuClickType.OVERFLOW_MENU_ITEM).map(summary)
    ).toEqual([
      {
        clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
        menuItemIndex: 1,
        menuItemText: 'Option A',
      },
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires overflowMenuItem at index 0 for the home screen entry, then opens the home screen', async () => {
    const { instance } = await openConversation({
      homescreen: { isOn: true, greeting: 'Welcome' },
      header: { menuOptions: [{ text: 'Option A', handler: () => {} }] },
    });
    expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(false);
    const openWhenFired: boolean[] = [];
    instance.on({
      type: BusEventType.HEADER_MENU_CLICK,
      handler: () =>
        openWhenFired.push(
          instance.getState().homeScreenState.isHomeScreenOpen
        ),
    });
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(byRole('menuitem', STRINGS.homeScreen_overflowMenuHomeScreen));
    const itemClicks = menuClicks(
      events,
      HeaderMenuClickType.OVERFLOW_MENU_ITEM
    );
    expect(itemClicks.map(summary)).toEqual([
      {
        clickType: HeaderMenuClickType.OVERFLOW_MENU_ITEM,
        menuItemIndex: 0,
        menuItemText: STRINGS.homeScreen_overflowMenuHomeScreen,
      },
    ]);
    expect(openWhenFired[events.events.indexOf(itemClicks[0])]).toBe(false);
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
  });

  it('fires no overflowMenuItem for a link option', async () => {
    const { instance } = await openConversation({
      header: {
        menuOptions: [
          { text: 'Docs', href: '#contract-docs', testId: 'contract-link' },
        ],
      },
    });
    const option = getByTestId('contract-link');
    // The option renders as a link to its href, so the click below lands on a
    // real link rather than on nothing.
    const link = byRole('link', 'Docs', option);
    expect(link.getAttribute('href')).toBe('#contract-docs');
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(link);
    expect(menuClicks(events, HeaderMenuClickType.OVERFLOW_MENU_ITEM)).toEqual(
      []
    );
  });
});

// @covers event.header:menuClick state.homeScreenState.isHomeScreenOpen
// @covers config.homescreen.isOn
describe('header:menuClick from the home screen button', () => {
  contractSetup();

  it('fires homescreenButton with the button label, before the home screen opens', async () => {
    const { instance } = await openConversation({
      homescreen: { isOn: true, greeting: 'Welcome' },
    });
    const openWhenFired: boolean[] = [];
    instance.on({
      type: BusEventType.HEADER_MENU_CLICK,
      handler: () =>
        openWhenFired.push(
          instance.getState().homeScreenState.isHomeScreenOpen
        ),
    });
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(byRole('button', STRINGS.homeScreen_returnToHome));
    expect(menuClicks(events).map(summary)).toEqual([
      {
        clickType: HeaderMenuClickType.HOMESCREEN_BUTTON,
        menuItemIndex: undefined,
        menuItemText: STRINGS.homeScreen_returnToHome,
      },
    ]);
    expect(openWhenFired).toEqual([false]);
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
  });
});

const DISCLAIMER = {
  isOn: true,
  disclaimerHTML: '<p>Contract terms of use</p>',
};

/**
 * Clicks the accept button until the chat records the acceptance: the button
 * only takes a click once the panel has measured its content.
 */
async function accept(instance: ChatInstance): Promise<void> {
  const accepted = () =>
    instance.getState().disclaimersAccepted[hostname()] === true;
  await waitFor(() => {
    if (!accepted()) {
      byTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON)?.click();
    }
    expect(accepted()).toBe(true);
  });
}

/** Props for a chat that opens with the disclaimer on. */
function disclaimerProps(
  disclaimer = DISCLAIMER,
  extra: Partial<ChatContainerProps> = {}
): Partial<ChatContainerProps> {
  return {
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    disclaimer,
    ...extra,
  };
}

function hostname(): string {
  return window.location.hostname;
}

// @covers event.disclaimerAccepted state.disclaimersAccepted
// @covers config.disclaimer config.disclaimer.isOn config.disclaimer.disclaimerHTML
describe('disclaimer acceptance', () => {
  contractSetup();

  it('shows the disclaimer HTML in the disclaimer panel, with nothing accepted', async () => {
    const { instance } = await contractChat(disclaimerProps());
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
        'Contract terms of use'
      )
    );
    expect(instance.getState().disclaimersAccepted).toEqual({});
  });

  it('draws no disclaimer panel when isOn is false', async () => {
    await contractChat(disclaimerProps({ ...DISCLAIMER, isOn: false }));
    expect(byTestId(PageObjectId.DISCLAIMER_PANEL)).toBeNull();
    expect(byTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON)).toBeNull();
  });

  it('fires disclaimerAccepted once when the user accepts, after recording it under the page hostname', async () => {
    const { instance } = await contractChat(disclaimerProps());
    const seenInHandler: unknown[] = [];
    instance.on({
      type: BusEventType.DISCLAIMER_ACCEPTED,
      handler: () =>
        seenInHandler.push(instance.getState().disclaimersAccepted),
    });
    const events = recordEvents(instance, [BusEventType.DISCLAIMER_ACCEPTED]);
    await accept(instance);
    expect(events.types()).toEqual(['disclaimerAccepted']);
    expect(seenInHandler).toEqual([{ [hostname()]: true }]);
    expect(instance.getState().disclaimersAccepted).toEqual({
      [hostname()]: true,
    });
  });

  it('keeps acceptance across a remount in the same session, firing nothing', async () => {
    const first = await contractChat(disclaimerProps());
    await accept(first.instance);
    first.unmount();
    const fired: string[] = [];
    const second = await contractChat(
      disclaimerProps(DISCLAIMER, {
        onBeforeRender: (instance: ChatInstance) => {
          instance.on({
            type: BusEventType.DISCLAIMER_ACCEPTED,
            handler: (event) => fired.push(event.type),
          });
        },
      })
    );
    expect(second.instance.getState().disclaimersAccepted).toEqual({
      [hostname()]: true,
    });
    expect(fired).toEqual([]);
  });

  it('asks again when the disclaimer HTML changes, and fires again on the next accept', async () => {
    const { instance, rerender } = await contractChat(disclaimerProps());
    await accept(instance);
    const events = recordEvents(instance, [BusEventType.DISCLAIMER_ACCEPTED]);
    const changed = { isOn: true, disclaimerHTML: '<p>New contract terms</p>' };
    await rerender(disclaimerProps(changed));
    // `main` marks the hostname `false` rather than removing it.
    await waitFor(() =>
      expect(instance.getState().disclaimersAccepted).toEqual({
        [hostname()]: false,
      })
    );
    await waitFor(() =>
      expect(shownText(getByTestId(PageObjectId.DISCLAIMER_PANEL))).toContain(
        'New contract terms'
      )
    );
    await accept(instance);
    expect(events.types()).toEqual(['disclaimerAccepted']);
    expect(instance.getState().disclaimersAccepted).toEqual({
      [hostname()]: true,
    });
  });

  it('sends the welcome request before the user accepts', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat(
      disclaimerProps(DISCLAIMER, {
        messaging: { customSendMessage: backend.customSendMessage },
      })
    );
    const welcome = await backend.next();
    expect(welcome.request.input.text).toBe('');
    expect(instance.getState().disclaimersAccepted).toEqual({});
  });
});

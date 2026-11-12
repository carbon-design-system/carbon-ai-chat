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
  byTestId,
  contractChat,
  contractSetup,
  fakeBackend,
  recordEvents,
  textResponse,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  header_overflowMenu_options: 'Contract menu',
  homeScreen_overflowMenuHomeScreen: 'Contract home entry',
  homeScreen_returnToHome: 'Contract back',
};

/** Every element under `root`, through open shadow roots. */
function* deepElements(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* deepElements(element.shadowRoot);
    }
  }
}

/** The text a node shows, following slots to what they show. */
function shownText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element) || node.tagName === 'STYLE') {
    return '';
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    return (assigned.length ? assigned : Array.from(node.childNodes))
      .map(shownText)
      .join('');
  }
  const children = node.shadowRoot
    ? node.shadowRoot.childNodes
    : node.childNodes;
  return Array.from(children).map(shownText).join('');
}

/** A simple accessible name: aria-label, then content. */
function accessibleName(element: Element): string {
  return (
    element.getAttribute('aria-label') ||
    shownText(element).replace(/\s+/g, ' ').trim()
  );
}

function roleOf(element: Element): string | null {
  return (
    element.getAttribute('role') ??
    (element instanceof HTMLButtonElement ? 'button' : null)
  );
}

/**
 * The control with this role and accessible name, searching shadow roots.
 * Where a custom element and the native control inside it both match, the
 * native one wins, since that's what a user clicks.
 */
function byRole(role: string, name: string): HTMLElement | null {
  const matches = [...deepElements(document)].filter(
    (element) => roleOf(element) === role && accessibleName(element) === name
  ) as HTMLElement[];
  return (
    matches.find((element) => element instanceof HTMLButtonElement) ??
    matches[0] ??
    null
  );
}

function getByRole(role: string, name: string): HTMLElement {
  const element = byRole(role, name);
  if (!element) {
    throw new Error(`no ${role} named "${name}"`);
  }
  return element;
}

function getByTestId(testId: string): HTMLElement {
  const element = byTestId(testId);
  if (!element) {
    throw new Error(`no element with test ID "${testId}"`);
  }
  return element;
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

/**
 * Mounts a chat with the test strings, opens the main window, and leaves the
 * home screen (a response closes it), so the header shows its navigation.
 */
async function openConversation(config: Partial<PublicConfig> = {}) {
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    messaging: { skipWelcome: true },
  });
  await act(() => mount.instance.changeView(ViewType.MAIN_WINDOW));
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

// @covers event.header:menuClick config.header.menuOptions
describe('header:menuClick from the overflow menu', () => {
  contractSetup();

  it('fires overflowMenuOpened, with no index or text, when the user opens the menu', async () => {
    const { instance } = await openConversation({
      header: { menuOptions: [{ text: 'Option A', handler: () => {} }] },
    });
    const events = recordEvents(instance);
    await click(getByRole('button', STRINGS.header_overflowMenu_options));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'header:menuClick',
    ]);
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
    // a browser does the same depends on where Carbon places the open menu.
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
    await click(
      getByRole('menuitem', STRINGS.homeScreen_overflowMenuHomeScreen)
    );
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
    const events = recordEvents(instance, [BusEventType.HEADER_MENU_CLICK]);
    await click(getByTestId('contract-link'));
    // `main` gives an `href` option no click handler (Header.tsx), so it fires
    // no overflowMenuItem, though the event's JSDoc covers every item.
    expect(menuClicks(events, HeaderMenuClickType.OVERFLOW_MENU_ITEM)).toEqual(
      []
    );
  });
});

// @covers event.header:menuClick state.homeScreenState.isHomeScreenOpen
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
    const events = recordEvents(instance);
    await click(getByRole('button', STRINGS.homeScreen_returnToHome));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'header:menuClick',
    ]);
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

/** Waits for the accept button to turn on (it waits for the panel to measure). */
async function acceptButton(): Promise<HTMLElement> {
  let button: HTMLElement | null = null;
  await waitFor(() => {
    button = byTestId(PageObjectId.DISCLAIMER_ACCEPT_BUTTON);
    expect(button).not.toBeNull();
    expect(button.hasAttribute('disabled')).toBe(false);
  });
  return button;
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
    const events = recordEvents(instance);
    await click(await acceptButton());
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([
      'disclaimerAccepted',
    ]);
    expect(seenInHandler).toEqual([{ [hostname()]: true }]);
    expect(instance.getState().disclaimersAccepted).toEqual({
      [hostname()]: true,
    });
  });

  it('keeps acceptance across a remount in the same session, firing nothing', async () => {
    const first = await contractChat(disclaimerProps());
    await click(await acceptButton());
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
    await click(await acceptButton());
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
    await click(await acceptButton());
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
    // The disclaimer gates what the user sees, not the welcome request.
    const welcome = await backend.next();
    expect(welcome.request.input.text).toBe('');
    expect(instance.getState().disclaimersAccepted).toEqual({});
  });
});

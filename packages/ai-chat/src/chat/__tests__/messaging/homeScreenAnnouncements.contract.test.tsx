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
  ViewType,
  type ChatContainerProps,
  type ChatInstance,
} from '../../../aiChatEntry';
import {
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  pause,
  textResponse,
  type ContractMount,
} from '../helpers/contract';

/**
 * Longer than the shared announcer's delay before it writes a region. Used
 * only where no later delivery can serve as a barrier. The delay itself is
 * the components package's to test.
 */
const DELIVERY_WINDOW = 300;

const SHOWN = 'Owned home screen visible notice';
const HIDDEN = 'Owned conversation return notice';
const CLOSED = 'Owned window closed notice';
const RENAMED_SHOWN = 'Renamed home screen visible notice';
const RENAMED_HIDDEN = 'Renamed conversation return notice';
const RENAMED_CLOSED = 'Renamed window closed notice';
const RETURN_HOME = 'Return to the owned home';
const RETURN_TO_CONVERSATION = 'Return to the owned conversation';

/** The owned wording, so every notice a test counts is unique. */
const STRINGS = {
  homeScreen_shown: SHOWN,
  homeScreen_hidden: HIDDEN,
  window_ariaWindowClosed: CLOSED,
  homeScreen_returnToHome: RETURN_HOME,
  homeScreen_returnToAssistant: RETURN_TO_CONVERSATION,
};

/** The same strings with new wording for the three notices. */
const RENAMED_STRINGS = {
  ...STRINGS,
  homeScreen_shown: RENAMED_SHOWN,
  homeScreen_hidden: RENAMED_HIDDEN,
  window_ariaWindowClosed: RENAMED_CLOSED,
};

type Politeness = 'polite' | 'assertive';

/**
 * Every polite or assertive live region in the document, through open
 * shadow roots.
 */
function liveRegions(root: ParentNode = document): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    const live = element.getAttribute('aria-live');
    if (live === 'polite' || live === 'assertive') {
      found.push(element);
    }
    if (element.shadowRoot) {
      found.push(...liveRegions(element.shadowRoot));
    }
  }
  return found;
}

/** What the live regions delivered from the moment recording started. */
interface DeliveryLog {
  /** How many times `text` was delivered, in any region or in one kind. */
  count(text: string, live?: Politeness): number;
  stop(): void;
}

/** Records the text each live region shows as the chat writes it. */
function recordDeliveries(): DeliveryLog {
  const deliveries: { live: string; text: string }[] = [];
  const observers = liveRegions().map((region) => {
    const live = region.getAttribute('aria-live');
    const observer = new MutationObserver(() => {
      const text = region.textContent?.trim();
      if (text) {
        deliveries.push({ live, text });
      }
    });
    observer.observe(region, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return observer;
  });
  return {
    count: (text, live) =>
      deliveries
        .filter((delivery) => !live || delivery.live === live)
        .reduce(
          (total, delivery) => total + delivery.text.split(text).length - 1,
          0
        ),
    stop: () => observers.forEach((observer) => observer.disconnect()),
  };
}

interface Recorded {
  mount: ContractMount;
  instance: ChatInstance;
  log: DeliveryLog;
  props: (strings: typeof STRINGS) => Partial<ChatContainerProps>;
}

/** Answers every send at once. A reply is the host's to add. */
const backend = fakeBackend({ autoResolve: true });

function chatProps(
  homeScreen: boolean,
  openChatByDefault: boolean,
  strings: typeof STRINGS
): Partial<ChatContainerProps> {
  return {
    openChatByDefault,
    ...(homeScreen
      ? { homescreen: { isOn: true, greeting: 'Owned home greeting' } }
      : {}),
    strings,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    },
  };
}

/**
 * Mounts a closed chat, starts recording once its live regions exist, then
 * opens it and waits for its first load. Recording starts before that load,
 * so anything it announces is counted.
 */
async function openRecording(props: Recorded['props']): Promise<Recorded> {
  const mount = await contractChat(props(STRINGS));
  await waitFor(() => expect(liveRegions().length).toBeGreaterThan(0));
  const log = recordDeliveries();
  const { instance } = mount;
  // Precondition: nothing about the home screen before the first load.
  await pause(DELIVERY_WINDOW);
  expect(log.count(SHOWN)).toBe(0);
  expect(log.count(HIDDEN)).toBe(0);
  await changeView(instance, ViewType.MAIN_WINDOW);
  await waitFor(() => expect(instance.getState().status).toBe('ready'));
  return { mount, instance, log, props };
}

/**
 * Mounts a closed chat with no home screen, starts recording, then opens it,
 * which starts its first load. A first load with no home screen showing has
 * nothing to announce about one.
 */
async function openWithoutHomeScreen(): Promise<Recorded> {
  const props = (strings: typeof STRINGS) => chatProps(false, false, strings);
  const chat = await openRecording(props);
  // The first load's own updates are past the delivery window by now.
  await pause(DELIVERY_WINDOW);
  expect(chat.log.count(HIDDEN)).toBe(0);
  expect(chat.log.count(SHOWN)).toBe(0);
  return chat;
}

/**
 * Mounts a closed chat with a home screen, starts recording, then opens it,
 * which starts its first load. The first load announces the shown home
 * screen once, after recording began.
 */
async function openWithHomeScreen(): Promise<Recorded> {
  const props = (strings: typeof STRINGS) => chatProps(true, false, strings);
  const chat = await openRecording(props);
  await waitFor(() => expect(chat.log.count(SHOWN, 'polite')).toBe(1));
  expect(homeIsOpen(chat.instance)).toBe(true);
  return chat;
}

function homeIsOpen(instance: ChatInstance): boolean {
  return instance.state.get().homeScreenState.isHomeScreenOpen;
}

let replies = 0;

/**
 * Adds a completed reply and waits for its delivery. A polite value the chat
 * queued before it goes out in or before the same write.
 */
async function deliverReply(
  { instance, log }: Recorded,
  text: string
): Promise<void> {
  replies += 1;
  await act(() =>
    instance.messaging.addMessage(textResponse(text, `reply-${replies}`))
  );
  await waitFor(() => expect(log.count(text)).toBe(1));
}

/** The user's message and the host's reply to it. */
async function converse(chat: Recorded, reply: string): Promise<void> {
  await act(() => chat.instance.messaging.send('Owned user question'));
  await deliverReply(chat, reply);
}

/**
 * Closes the window and waits for its notice, in `closed` wording. A
 * barrier that leaves the home screen as it is.
 */
async function deliverClosed(
  { instance, log }: Recorded,
  closed: string
): Promise<void> {
  const before = log.count(closed, 'polite');
  await changeView(instance, ViewType.LAUNCHER);
  await waitFor(() => expect(log.count(closed, 'polite')).toBe(before + 1));
}

async function restart({ instance }: Recorded): Promise<void> {
  await act(() => instance.messaging.restartConversation());
  await waitFor(() => expect(instance.getState().status).toBe('ready'));
}

async function end({ mount, log }: Recorded): Promise<void> {
  log.stop();
  await act(async () => mount.unmount());
}

describe('public home screen announcements with no home screen', () => {
  contractSetup();

  it('never announces a return to the conversation for the first message and its reply', async () => {
    const chat = await openWithoutHomeScreen();
    try {
      await converse(chat, 'Owned first reply');
      // A repeat the reply's own render set off would be queued after it.
      await pause(DELIVERY_WINDOW);
      expect(chat.log.count('Owned first reply')).toBe(1);
      expect(chat.log.count(HIDDEN)).toBe(0);
      expect(chat.log.count(SHOWN)).toBe(0);
    } finally {
      await end(chat);
    }
  });

  it('announces nothing about a home screen when the host changes its strings', async () => {
    const chat = await openWithoutHomeScreen();
    try {
      await converse(chat, 'Owned reply before the rename');
      await pause(DELIVERY_WINDOW);
      await chat.mount.rerender(chat.props(RENAMED_STRINGS));
      // The closed notice in the new wording shows the new strings are live,
      // and is the barrier for anything the rename queued.
      await deliverClosed(chat, RENAMED_CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(chat.log.count(RENAMED_HIDDEN)).toBe(0);
      expect(chat.log.count(RENAMED_SHOWN)).toBe(0);
    } finally {
      await end(chat);
    }
  });

  it('announces nothing about a home screen when a restart loads the chat again', async () => {
    const chat = await openWithoutHomeScreen();
    try {
      await converse(chat, 'Owned reply before the restart');
      await pause(DELIVERY_WINDOW);
      const before = chat.log.count(HIDDEN);
      await restart(chat);
      // A reply after the restart is the barrier for its load.
      await deliverReply(chat, 'Owned reply after the restart');
      await pause(DELIVERY_WINDOW);
      expect(chat.log.count(HIDDEN)).toBe(before);
      expect(chat.log.count(SHOWN)).toBe(0);
    } finally {
      await end(chat);
    }
  });
});

describe('public home screen announcements with a home screen', () => {
  contractSetup();

  it('announces each change of the home screen once: leaving it, going back, and returning to the conversation', async () => {
    // The first load's notice is counted in openWithHomeScreen.
    const chat = await openWithHomeScreen();
    const { instance, log } = chat;
    try {
      // The first message leaves the home screen.
      await converse(chat, 'Owned reply leaving home');
      expect(homeIsOpen(instance)).toBe(false);
      await waitFor(() => expect(log.count(HIDDEN, 'polite')).toBe(1));

      await click(await waitFor(() => byRole('button', RETURN_HOME)));
      await waitFor(() => expect(homeIsOpen(instance)).toBe(true));
      await waitFor(() => expect(log.count(SHOWN, 'polite')).toBe(2));

      await click(
        await waitFor(() => byRole('button', RETURN_TO_CONVERSATION))
      );
      await waitFor(() => expect(homeIsOpen(instance)).toBe(false));
      await waitFor(() => expect(log.count(HIDDEN, 'polite')).toBe(2));

      // A later reply is the positive barrier for any repeat.
      await deliverReply(chat, 'Owned reply after returning');
      await pause(DELIVERY_WINDOW);
      expect(log.count(SHOWN)).toBe(2);
      expect(log.count(HIDDEN)).toBe(2);
      expect(log.count(SHOWN, 'assertive')).toBe(0);
      expect(log.count(HIDDEN, 'assertive')).toBe(0);
    } finally {
      await end(chat);
    }
  });

  it('does not announce the shown home screen again when the host changes its strings', async () => {
    const chat = await openWithHomeScreen();
    try {
      await pause(DELIVERY_WINDOW);
      await chat.mount.rerender(chat.props(RENAMED_STRINGS));
      await deliverClosed(chat, RENAMED_CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(homeIsOpen(chat.instance)).toBe(true);
      expect(chat.log.count(RENAMED_SHOWN)).toBe(0);
      expect(chat.log.count(SHOWN)).toBe(1);
    } finally {
      await end(chat);
    }
  });

  it('does not announce the home screen again when a restart loads the chat with it still shown', async () => {
    const chat = await openWithHomeScreen();
    try {
      await pause(DELIVERY_WINDOW);
      await restart(chat);
      expect(homeIsOpen(chat.instance)).toBe(true);
      await deliverClosed(chat, CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(chat.log.count(SHOWN)).toBe(1);
      expect(chat.log.count(HIDDEN)).toBe(0);
    } finally {
      await end(chat);
    }
  });

  it('announces a return to the conversation once when a host message closes the home screen', async () => {
    const chat = await openWithHomeScreen();
    const { instance, log } = chat;
    try {
      await deliverReply(chat, 'Owned host message on the home screen');
      expect(homeIsOpen(instance)).toBe(false);
      await waitFor(() => expect(log.count(HIDDEN, 'polite')).toBe(1));
      await deliverClosed(chat, CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(log.count(HIDDEN)).toBe(1);
      expect(log.count(SHOWN)).toBe(1);
    } finally {
      await end(chat);
    }
  });

  it('announces the home screen hiding once when the host turns it off, and showing once when the host turns it back on in an empty conversation', async () => {
    const chat = await openWithHomeScreen();
    const { instance, log, mount } = chat;
    try {
      await mount.rerender({
        ...chat.props(STRINGS),
        homescreen: { isOn: false },
      });
      await waitFor(() => expect(homeIsOpen(instance)).toBe(false));
      await waitFor(() => expect(log.count(HIDDEN, 'polite')).toBe(1));

      await mount.rerender(chat.props(STRINGS));
      await waitFor(() => expect(homeIsOpen(instance)).toBe(true));
      await waitFor(() => expect(log.count(SHOWN, 'polite')).toBe(2));

      await deliverClosed(chat, CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(log.count(HIDDEN)).toBe(1);
      expect(log.count(SHOWN)).toBe(2);
    } finally {
      await end(chat);
    }
  });

  it('announces the home screen once when a restart brings it back', async () => {
    const chat = await openWithHomeScreen();
    const { instance, log } = chat;
    try {
      await converse(chat, 'Owned reply before the home restart');
      await waitFor(() => expect(log.count(HIDDEN, 'polite')).toBe(1));
      await restart(chat);
      expect(homeIsOpen(instance)).toBe(true);
      await waitFor(() => expect(log.count(SHOWN, 'polite')).toBe(2));
      await deliverClosed(chat, CLOSED);
      await pause(DELIVERY_WINDOW);
      expect(log.count(SHOWN)).toBe(2);
      expect(log.count(HIDDEN)).toBe(1);
    } finally {
      await end(chat);
    }
  });
});

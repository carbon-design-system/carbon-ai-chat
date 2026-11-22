/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { PageObjectId, ViewType } from '../../../aiChatEntry';
import {
  advance,
  allByRole,
  byRole,
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  getByTestId,
  isShownWithin,
} from '../helpers/contract';

const LOADING = 'Owned chat loading notice';
const CLOSED = 'Owned window closed notice';
const PANEL_NAME = 'Owned loading panel';

/** How long the chat waits before it shows and announces a load. */
const LOADING_DELAY = 400;

/**
 * Longer than the shared announcer's delay before it writes a region. The
 * delay itself is the components package's to test.
 */
const DELIVERY_WINDOW = 300;

type Politeness = 'polite' | 'assertive';

/**
 * Fakes only `setTimeout`, which owns the loading delay and the announcer's
 * write, from before the mount, so the test owns the clock the delay runs on.
 */
function controlTimeouts(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

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

/** Records the text each live region shows as the chat writes it. */
function recordDeliveries() {
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
    /** How many times `text` was delivered, in any region or in one kind. */
    count: (text: string, live?: Politeness) =>
      deliveries
        .filter((delivery) => !live || delivery.live === live)
        .reduce(
          (total, delivery) => total + delivery.text.split(text).length - 1,
          0
        ),
    stop: () => observers.forEach((observer) => observer.disconnect()),
  };
}

/**
 * Mounts a chat that opens at once and asks for its welcome, on a clock the
 * test owns from before the mount. Returns the time the mount took on that
 * clock: the chat's loading delay started inside it.
 */
async function openLoadingChat() {
  controlTimeouts();
  const startedAt = vi.getMockedSystemTime()!.getTime();
  const backend = fakeBackend();
  const mount = await contractChat({
    openChatByDefault: true,
    strings: {
      window_ariaWindowLoading: LOADING,
      window_ariaWindowClosed: CLOSED,
      aria_hydrationPanel: PANEL_NAME,
    },
    messaging: { customSendMessage: backend.customSendMessage },
  });
  await waitFor(() => expect(liveRegions().length).toBeGreaterThan(0));
  const log = recordDeliveries();
  const welcome = await backend.next();
  return {
    mount,
    log,
    welcome,
    elapsed: () => vi.getMockedSystemTime()!.getTime() - startedAt,
  };
}

/** Closes the window, whose own notice shows the recorder still hears it. */
async function deliverClosedNotice(
  chat: Awaited<ReturnType<typeof openLoadingChat>>
): Promise<void> {
  await changeView(chat.mount.instance, ViewType.LAUNCHER);
  await advance(DELIVERY_WINDOW);
  expect(chat.log.count(CLOSED, 'polite')).toBe(1);
}

// These tests cover a chat that opens at mount, whose first load starts as
// its loading panel first draws. Later load cycles have their own contract.
describe('public hydration loading notice for a chat open at mount', () => {
  contractSetup();

  it('announces a slow first load once, politely, after its delay and while the loading panel shows', async () => {
    const chat = await openLoadingChat();
    const { instance } = chat.mount;
    try {
      // Precondition: the mount left more than a delivery window of the
      // delay, so a notice sent without the delay would show by 399 ms.
      expect(chat.elapsed()).toBeLessThan(LOADING_DELAY - DELIVERY_WINDOW);
      await advance(LOADING_DELAY - 1 - chat.elapsed());
      expect(chat.log.count(LOADING)).toBe(0);

      await advance(LOADING_DELAY + DELIVERY_WINDOW);
      expect(chat.log.count(LOADING, 'polite')).toBe(1);
      expect(chat.log.count(LOADING, 'assertive')).toBe(0);
      expect(instance.getState().status).toBe('loading');
      expect(
        isShownWithin(
          byRole('dialog', PANEL_NAME),
          getByTestId(PageObjectId.HYDRATING_PANEL)
        )
      ).toBe(true);

      // The same load never repeats it.
      await advance(LOADING_DELAY + DELIVERY_WINDOW);
      await act(async () => {
        chat.welcome.resolve();
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));
      await waitFor(() =>
        expect(allByRole('dialog', PANEL_NAME)).toHaveLength(0)
      );
      await deliverClosedNotice(chat);
      expect(chat.log.count(LOADING)).toBe(1);
    } finally {
      chat.log.stop();
      await act(async () => chat.mount.unmount());
    }
  });

  it('never announces a first load that finishes before its delay', async () => {
    const chat = await openLoadingChat();
    const { instance } = chat.mount;
    try {
      await act(async () => {
        chat.welcome.resolve();
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));
      // Precondition: the load finished inside the delay on the test's clock.
      expect(chat.elapsed()).toBeLessThan(LOADING_DELAY);

      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));
      expect(allByRole('dialog', PANEL_NAME)).toHaveLength(0);
      // Positive control: the recorder still hears a notice after the delay.
      await deliverClosedNotice(chat);
      expect(chat.log.count(LOADING)).toBe(0);
    } finally {
      chat.log.stop();
      await act(async () => chat.mount.unmount());
    }
  });
});

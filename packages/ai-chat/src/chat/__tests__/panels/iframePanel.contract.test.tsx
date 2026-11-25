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
  MessageResponseTypes,
  PageObjectId,
  type GenericItem,
} from '../../../aiChatEntry';
import {
  advance,
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  isShownWithin,
  responseOf,
  shownText,
} from '../helpers/contract';

const FRAME_TITLE = 'Owned frame';
const FRAME_SOURCE = 'https://example.com/owned-embed';
const FRAME_HOST = new URL(FRAME_SOURCE).host;
/** The preview card's name: its title, the source's host, then the source. */
const CARD_NAME = `${FRAME_TITLE}example.com${FRAME_SOURCE}`;
const LOADED = 'Owned frame loaded notice';
const UNAVAILABLE = 'Owned frame unavailable notice';

/** How long the panel waits for its page before it shows an error. */
const FRAME_TIMEOUT = 20_000;

/**
 * Longer than the shared announcer's delay before it writes a region. The
 * delay itself is the components package's to test.
 */
const DELIVERY_WINDOW = 300;

/** Real `setTimeout`, kept before a test fakes it. */
const realSetTimeout = globalThis.setTimeout;

/** Fakes only `setTimeout`, which owns the panel's wait for its page. */
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
    /** How many times `text` was delivered, in any region or politely. */
    count: (text: string, live?: 'polite' | 'assertive') =>
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
 * Runs `check` until it passes, letting the chat finish the work due now
 * between tries but moving the test's clock no further.
 */
async function settle<T>(check: () => T): Promise<T> {
  for (let round = 0; ; round += 1) {
    try {
      return check();
    } catch (error) {
      if (round >= 10) {
        throw error;
      }
    }
    await advance(0);
  }
}

/** The iframe panel, found by its public test ID. */
function framePanel(): HTMLElement {
  return getByTestId(PageObjectId.IFRAME_PANEL);
}

/** Whether some live region shows text that includes `text`. */
function regionShows(text: string): boolean {
  return liveRegions().some((region) => region.textContent?.includes(text));
}

/**
 * Moves the fake clock in small steps and lets real time pass between them,
 * until `check` passes. Markdown throttles its renders against the real
 * clock (`Date` stays real), so its text needs both.
 */
async function untilRendered(check: () => void): Promise<void> {
  for (let step = 0; ; step += 1) {
    try {
      check();
      return;
    } catch (error) {
      if (step >= 100) {
        throw error;
      }
    }
    await advance(100);
    await act(async () => {
      await new Promise((resolve) => realSetTimeout(resolve, 20));
    });
  }
}

/**
 * The page's frame, shown inside the open panel. The panel slots its body in,
 * so the frame is found in the document and checked in the flat tree.
 */
function shownFrame(): HTMLElement {
  const frame = byRole('application', FRAME_TITLE);
  if (!isShownWithin(frame, framePanel())) {
    throw new Error('the frame is not shown in the iframe panel');
  }
  return frame;
}

/**
 * Mounts an open chat with an iframe reply, then opens the reply's page in
 * the iframe panel on a clock the test owns. jsdom loads no page for an
 * `https` source, so the frame stays loading until the test fires its
 * `load`, the way a browser reports the page arriving.
 */
async function openFramePanel() {
  const mount = await contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    strings: {
      iframe_ariaSourceLoaded: LOADED,
      errors_iframeSource: UNAVAILABLE,
    },
  });
  await act(() =>
    mount.instance.messaging.addMessage(
      responseOf('owned-frame-reply', [
        {
          response_type: MessageResponseTypes.IFRAME,
          source: FRAME_SOURCE,
          title: FRAME_TITLE,
        } as GenericItem,
      ])
    )
  );
  const card = await waitFor(() => byRole('button', CARD_NAME));
  // The chat announces the reply, and anything queued before it, after a
  // delay on the real clock. Let that land before faking timers, or every
  // later polite announcement waits behind a real-clock delivery.
  await waitFor(() => expect(regionShows(FRAME_HOST)).toBe(true));
  const log = recordDeliveries();
  controlTimeouts();
  await click(card);
  const frame = await settle(shownFrame);
  return { mount, log, frame };
}

/** Fires the frame's `load`, as a browser does when its page arrives. */
async function load(frame: HTMLElement): Promise<void> {
  await act(async () => {
    frame.dispatchEvent(new Event('load'));
  });
}

describe('public iframe panel', () => {
  contractSetup();

  it('announces a loaded page once and shows no error after the wait it would have timed out at', async () => {
    const { mount, log, frame } = await openFramePanel();
    try {
      await load(frame);
      await advance(DELIVERY_WINDOW);
      expect(log.count(LOADED, 'polite')).toBe(1);

      await advance(FRAME_TIMEOUT + DELIVERY_WINDOW);
      expect(shownFrame()).toBe(frame);
      expect(shownText(framePanel())).not.toContain(UNAVAILABLE);
      expect(log.count(UNAVAILABLE)).toBe(0);
      expect(log.count(LOADED)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('shows and announces an error when the page never loads, and keeps it through a late load', async () => {
    const { mount, log, frame } = await openFramePanel();
    try {
      await advance(FRAME_TIMEOUT - 1);
      expect(shownFrame()).toBe(frame);
      expect(shownText(framePanel())).not.toContain(UNAVAILABLE);

      await advance(1);
      await settle(() =>
        expect(allByRole('application', FRAME_TITLE)).toHaveLength(0)
      );
      await advance(DELIVERY_WINDOW);
      expect(log.count(UNAVAILABLE, 'polite')).toBe(1);
      await untilRendered(() =>
        expect(shownText(framePanel())).toContain(UNAVAILABLE)
      );

      // The page the panel gave up on arrives after all.
      await load(frame);
      await advance(DELIVERY_WINDOW);
      expect(shownText(framePanel())).toContain(UNAVAILABLE);
      expect(log.count(LOADED)).toBe(0);
      expect(log.count(UNAVAILABLE)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });
});

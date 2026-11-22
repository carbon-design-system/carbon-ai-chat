/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { type ChatInstance, ViewType } from '../../../aiChatEntry';
import {
  advance,
  allByRole,
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  shownText,
} from '../helpers/contract';

const LOADING = 'Cycle loading notice';
const CLOSED = 'Cycle window closed notice';
const PANEL_NAME = 'Cycle loading panel';
const STRINGS = {
  window_ariaWindowLoading: LOADING,
  window_ariaWindowClosed: CLOSED,
  aria_hydrationPanel: PANEL_NAME,
};

/** How long the chat waits, from the start of a load, before it shows and announces it. */
const LOADING_DELAY = 400;

/**
 * Longer than the shared announcer's delay before it writes a region. The
 * delay itself is the components package's to test.
 */
const DELIVERY_WINDOW = 300;

/** A load that finishes well inside the delay. */
const FAST_LOAD = 100;

/** How often a test looks at the loading panel while a load runs. */
const STEP = 10;

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

type Log = ReturnType<typeof recordDeliveries>;

/** The loading panel, while a user can see it. */
function shownLoadingPanels(): HTMLElement[] {
  return allByRole('dialog', PANEL_NAME);
}

/**
 * Whether the shown loading panel shows its spinner, which carries the
 * loading notice as its accessible text.
 */
function spinnerShown(): boolean {
  return shownLoadingPanels().some((panel) =>
    shownText(panel).includes(LOADING)
  );
}

/**
 * Steps the clock `ms` forward, `STEP` at a time, and reports whether the
 * loading panel showed at any step and whether its spinner did.
 */
async function watchLoadingPanel(ms: number) {
  let panelShown = false;
  let spinner = false;
  for (let elapsed = 0; elapsed < ms; elapsed += STEP) {
    await advance(Math.min(STEP, ms - elapsed));
    panelShown ||= shownLoadingPanels().length > 0;
    spinner ||= spinnerShown();
  }
  return { panelShown, spinner };
}

/** Mounts a chat with the test's strings and starts recording its notices. */
async function mountChat(props: Parameters<typeof contractChat>[0]) {
  controlTimeouts();
  const mount = await contractChat({ ...props, strings: STRINGS });
  await waitFor(() => expect(liveRegions().length).toBeGreaterThan(0));
  return { mount, log: recordDeliveries() };
}

/** Closes the window, whose own notice shows the recorder still hears it. */
async function deliverClosedNotice(
  instance: ChatInstance,
  log: Log
): Promise<void> {
  const before = log.count(CLOSED, 'polite');
  await changeView(instance, ViewType.LAUNCHER);
  await advance(DELIVERY_WINDOW);
  expect(log.count(CLOSED, 'polite')).toBe(before + 1);
}

/** Mounts a closed chat and waits well past the loading delay. */
async function lateOpeningChat() {
  const backend = fakeBackend();
  const chat = await mountChat({
    messaging: { customSendMessage: backend.customSendMessage },
  });
  await advance(2 * LOADING_DELAY);
  expect(chat.mount.instance.getState().viewState.mainWindow).toBe(false);
  expect(backend.requests).toHaveLength(0);
  return { ...chat, backend };
}

describe('public hydration loading notice across load cycles', () => {
  contractSetup();

  it('never announces or shows a fast first load that starts when the chat opens long after it mounted', async () => {
    const { mount, log, backend } = await lateOpeningChat();
    const { instance } = mount;
    try {
      await changeView(instance, ViewType.MAIN_WINDOW);
      const welcome = await backend.next();
      // Precondition: opening started the first load.
      expect(instance.getState().status).toBe('loading');

      const seen = await watchLoadingPanel(FAST_LOAD);
      expect(seen.panelShown).toBe(true);
      expect(seen.spinner).toBe(false);
      await act(async () => {
        welcome.resolve();
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));

      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));
      expect(spinnerShown()).toBe(false);
      await deliverClosedNotice(instance, log);
      expect(log.count(LOADING)).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('announces a slow first load that starts on a late open once, after its delay from the open', async () => {
    const { mount, log, backend } = await lateOpeningChat();
    const { instance } = mount;
    try {
      const openedAt = vi.getMockedSystemTime()!.getTime();
      await changeView(instance, ViewType.MAIN_WINDOW);
      const welcome = await backend.next();
      expect(instance.getState().status).toBe('loading');

      const early = await watchLoadingPanel(
        LOADING_DELAY - STEP - (vi.getMockedSystemTime()!.getTime() - openedAt)
      );
      expect(early.panelShown).toBe(true);
      expect(early.spinner).toBe(false);
      expect(log.count(LOADING)).toBe(0);

      await advance(STEP + DELIVERY_WINDOW);
      expect(log.count(LOADING, 'polite')).toBe(1);
      expect(log.count(LOADING, 'assertive')).toBe(0);
      // Positive control: the spinner check sees the spinner once it shows.
      expect(spinnerShown()).toBe(true);

      // The same load never repeats it.
      await advance(LOADING_DELAY + DELIVERY_WINDOW);
      await act(async () => {
        welcome.resolve();
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));
      await waitFor(() => expect(shownLoadingPanels()).toHaveLength(0));
      await deliverClosedNotice(instance, log);
      expect(log.count(LOADING)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('never announces or shows a fast reload after a restart that follows a finished load', async () => {
    const backend = fakeBackend();
    const { mount, log } = await mountChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const { instance } = mount;
    try {
      const welcome = await backend.next();
      await act(async () => {
        welcome.resolve();
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));
      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));
      // Precondition: the fast first load itself stayed silent.
      expect(log.count(LOADING)).toBe(0);

      let restarted: Promise<void>;
      await act(async () => {
        restarted = instance.messaging.restartConversation();
      });
      const seen = await watchLoadingPanel(FAST_LOAD);
      // Precondition: the restart started a second load, still running.
      const reload = backend.requests[1];
      expect(reload).toBeDefined();
      expect(instance.getState().status).toBe('loading');
      expect(seen.panelShown).toBe(true);
      expect(seen.spinner).toBe(false);
      await act(async () => {
        reload.resolve();
        await restarted;
      });
      await waitFor(() => expect(instance.getState().status).toBe('ready'));

      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));
      expect(spinnerShown()).toBe(false);
      await deliverClosedNotice(instance, log);
      expect(log.count(LOADING)).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('never announces or shows a fast host chat load on an open, loaded chat', async () => {
    const { mount, log } = await mountChat({
      openChatByDefault: true,
      messaging: {
        customSendMessage: fakeBackend({ autoResolve: true }).customSendMessage,
      },
    });
    const { instance } = mount;
    try {
      await waitFor(() => expect(instance.getState().status).toBe('ready'));
      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));

      await act(async () => {
        instance.updateIsChatLoadingCounter('increase');
      });
      const seen = await watchLoadingPanel(FAST_LOAD);
      expect(seen.panelShown).toBe(true);
      expect(seen.spinner).toBe(false);
      await act(async () => {
        instance.updateIsChatLoadingCounter('decrease');
      });
      await waitFor(() => expect(shownLoadingPanels()).toHaveLength(0));

      await advance(2 * (LOADING_DELAY + DELIVERY_WINDOW));
      await deliverClosedNotice(instance, log);
      expect(log.count(LOADING)).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });
});

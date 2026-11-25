/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  ChatContainer,
  type ChatContainerProps,
  type ChatInstance,
} from '../../../aiChatEntry';
import {
  contractSetup,
  deferred,
  fakeBackend,
  pause,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

/** How long any one wait in this file may take. */
const BOUND = 5000;

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          BOUND
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

/**
 * Longer than the shared announcer's delay before it writes a region, so a
 * repeat the chat queued has gone out. The delay itself is the components
 * package's to test.
 */
const DELIVERY_WINDOW = 300;

/** The typing message, set through `strings` so the test owns its words. */
const TYPING = 'Typing check: {assistantName} is preparing a reply';
const typingFor = (assistantName: string) =>
  TYPING.replace('{assistantName}', assistantName);

/**
 * Every polite or assertive live region in the document, through open
 * shadow roots.
 */
function liveRegions(): HTMLElement[] {
  const found: HTMLElement[] = [];
  const visit = (node: ParentNode) => {
    const elements = Array.from(node.querySelectorAll<HTMLElement>('*'));
    for (const element of elements) {
      const live = element.getAttribute('aria-live');
      if (live === 'polite' || live === 'assertive') {
        found.push(element);
      }
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
    }
  };
  visit(document);
  return found;
}

/** What the live regions delivered from the moment recording started. */
interface DeliveryLog {
  /** Where the next delivery will be recorded, for `count`'s `from`. */
  mark(): number;
  /**
   * How many times `text` was delivered from `from` on, in any region or
   * twice in one write.
   */
  count(text: string, from?: number): number;
  stop(): void;
}

/** Records the text each live region shows as the chat writes it. */
function recordDeliveries(): DeliveryLog {
  const deliveries: string[] = [];
  const observers = liveRegions().map((region) => {
    const observer = new MutationObserver(() => {
      const text = region.textContent?.trim();
      if (text) {
        deliveries.push(text);
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
    mark: () => deliveries.length,
    count: (text, from = 0) =>
      deliveries
        .slice(from)
        .reduce((total, shown) => total + shown.split(text).length - 1, 0),
    stop: () => observers.forEach((observer) => observer.disconnect()),
  };
}

/** Waits until `text` has gone out from `from` on, then for any repeat. */
async function settledCount(
  log: DeliveryLog,
  text: string,
  from = 0
): Promise<number> {
  await waitFor(() => expect(log.count(text, from)).toBeGreaterThan(0), {
    timeout: BOUND,
  });
  await pause(DELIVERY_WINDOW);
  return log.count(text, from);
}

describe('public typing indicator announcement', () => {
  contractSetup();

  it('announces a typing indicator once when it mounts already showing under React StrictMode, and still announces a new message and a later show', async () => {
    const backend = fakeBackend();
    // Constant objects, so a rename changes only the assistant name.
    const strings = { messages_assistantIsLoading: TYPING };
    const homescreen = { isOn: true, greeting: 'Typing check home' };
    const messaging = {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
      // The chat shows no loading indicator of its own, so only the host's
      // counter shows and hides it.
      messageLoadingIndicatorTimeoutSecs: 0,
      messageTimeoutSecs: 0,
    };
    const rendered = deferred();
    let instance: ChatInstance | undefined;
    const props = (assistantName: string) =>
      ({
        openChatByDefault: true,
        assistantName,
        strings,
        homescreen,
        messaging,
        onBeforeRender: (handed: ChatInstance) => {
          instance = handed;
        },
        onAfterRender: () => rendered.resolve(),
      }) as ChatContainerProps;
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <React.StrictMode>
          <ChatContainer {...props('Harbor')} />
        </React.StrictMode>
      );
    });
    let log: DeliveryLog | undefined;
    try {
      await bounded(rendered.promise, 'the StrictMode chat render');
      await waitFor(
        () => {
          expect(instance.state.get().status).toBe('ready');
          expect(instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
            true
          );
        },
        { timeout: BOUND }
      );
      log = recordDeliveries();
      const harbor = typingFor('Harbor');
      const lantern = typingFor('Lantern');

      // The host shows its loading indicator while the home screen is open,
      // so no message list draws it yet.
      await act(async () => {
        instance.updateIsMessageLoadingCounter('increase');
      });
      expect(instance.getState().isMessageLoadingCounter).toBe(1);
      await pause(DELIVERY_WINDOW);
      expect(log.count(harbor)).toBe(0);

      // A send closes the home screen, and the message list mounts with the
      // indicator already showing. StrictMode replays that mount's effects.
      await act(async () => {
        instance.messaging
          .send('Typing check request')
          .catch((): undefined => undefined);
      });
      await waitFor(
        () => {
          expect(instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
            false
          );
          expect(backend.requests).toHaveLength(1);
        },
        { timeout: BOUND }
      );
      expect(await settledCount(log, harbor)).toBe(1);

      // Positive control: a different typing message is announced once.
      const renamed = log.mark();
      await act(async () => {
        result.rerender(
          <React.StrictMode>
            <ChatContainer {...props('Lantern')} />
          </React.StrictMode>
        );
      });
      expect(await settledCount(log, lantern, renamed)).toBe(1);
      expect(log.count(harbor, renamed)).toBe(0);

      // Positive control: the same message, hidden and shown again, is
      // announced once more.
      const hidden = log.mark();
      await act(async () => {
        instance.updateIsMessageLoadingCounter('decrease');
      });
      expect(instance.getState().isMessageLoadingCounter).toBe(0);
      await pause(DELIVERY_WINDOW);
      expect(log.count(lantern, hidden)).toBe(0);
      const shown = log.mark();
      await act(async () => {
        instance.updateIsMessageLoadingCounter('increase');
      });
      expect(await settledCount(log, lantern, shown)).toBe(1);
    } finally {
      log?.stop();
      await act(async () => result.unmount());
    }
  });
});

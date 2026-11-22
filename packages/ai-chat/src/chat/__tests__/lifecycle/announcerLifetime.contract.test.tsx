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
  pause,
  textResponse,
} from '../helpers/contract';

/**
 * Longer than the shared announcer's delay before it writes a region, so a
 * repeat the chat queued has gone out. The delay itself is the components
 * package's to test.
 */
const DELIVERY_WINDOW = 300;

/** A first chat boot's wait, the repo convention. */
const BOOT = { timeout: 5000 };

/**
 * Every polite or assertive live region in `root`'s tree, through open
 * shadow roots. An element root's own shadow root is visited first, since
 * the chat element keeps its announcer regions there rather than in its
 * light DOM.
 */
function liveRegions(root: ParentNode = document): HTMLElement[] {
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
  if (root instanceof Element && root.shadowRoot) {
    visit(root.shadowRoot);
  }
  visit(root);
  return found;
}

let replies = 0;

/**
 * Adds a completed reply and expects `text` delivered exactly once across
 * every live region in `root`'s tree, both when it goes out and after the
 * delivery window. Occurrences are counted, so a doubled announcement fails
 * whether it lands in a second region or twice in one. Resolves with the
 * regions that delivered it.
 */
async function expectOneDelivery(
  instance: ChatInstance,
  text: string,
  root: ParentNode = document
): Promise<HTMLElement[]> {
  const carrying: HTMLElement[] = [];
  let occurrences = 0;
  const observers = liveRegions(root).map((region) => {
    const observer = new MutationObserver(() => {
      const shown = region.textContent ?? '';
      const found = shown.split(text).length - 1;
      if (found) {
        occurrences += found;
        carrying.push(region);
      }
    });
    observer.observe(region, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return observer;
  });
  try {
    replies += 1;
    await act(() =>
      instance.messaging.addMessage(textResponse(text, `reply-${replies}`))
    );
    await waitFor(() => expect(occurrences).toBe(1));
    await pause(DELIVERY_WINDOW);
    expect(occurrences).toBe(1);
    return carrying;
  } finally {
    observers.forEach((observer) => observer.disconnect());
  }
}

type HostElement = HTMLElement & Record<string, unknown>;

/** A `cds-aichat-container` the test attaches and removes itself. */
interface ElementHost {
  element: HostElement;
  /** The instance the latest mount handed to `onBeforeRender`. */
  instance(): ChatInstance;
  beforeRenders(): number;
  afterRenders(): number;
}

/**
 * Makes an open chat element with no welcome request. `beforeRender` is what
 * its `onBeforeRender` returns, such as a promise the test holds.
 */
function elementHost(beforeRender?: () => Promise<void>): ElementHost {
  const element = document.createElement(
    'cds-aichat-container'
  ) as unknown as HostElement;
  let instance: ChatInstance | undefined;
  let before = 0;
  let after = 0;
  Object.assign(element, {
    openChatByDefault: true,
    messaging: { skipWelcome: true },
  });
  element.onBeforeRender = (handed: ChatInstance) => {
    instance = handed;
    before += 1;
    return beforeRender?.();
  };
  element.onAfterRender = () => {
    after += 1;
  };
  return {
    element,
    instance: () => instance,
    beforeRenders: () => before,
    afterRenders: () => after,
  };
}

async function attach(host: ElementHost): Promise<void> {
  await act(async () => {
    document.body.appendChild(host.element);
  });
}

/**
 * Removes the element and lets the task's microtasks run: the element keeps
 * its chat through a move, and releases it only once it is still detached
 * after them.
 */
async function detach(host: ElementHost): Promise<void> {
  await act(async () => {
    host.element.remove();
  });
  await pause(0);
}

describe('public host announcer lifetime', () => {
  contractSetup();

  it('connects live regions only after onBeforeRender settles and keeps one delivery through a host property change', async () => {
    const held = deferred();
    const host = elementHost(() => held.promise);
    await attach(host);
    await waitFor(() => expect(host.beforeRenders()).toBe(1), BOOT);
    await pause(50);
    expect(liveRegions(host.element)).toEqual([]);
    expect(host.afterRenders()).toBe(0);
    await act(async () => {
      held.resolve();
    });
    await waitFor(() => expect(host.afterRenders()).toBe(1), BOOT);
    expect(liveRegions(host.element).length).toBeGreaterThan(0);
    const mounted = host.instance();
    await expectOneDelivery(
      mounted,
      'Lifetime delivery before rename',
      host.element
    );
    const regionsBefore = liveRegions(host.element);
    await act(async () => {
      host.element.assistantName = 'Renamed lifetime host';
    });
    await pause(50);
    const carrying = await expectOneDelivery(
      host.instance(),
      'Lifetime delivery after rename',
      host.element
    );
    // The rename kept the mount, so the same announcer delivered.
    expect(host.beforeRenders()).toBe(1);
    expect(host.afterRenders()).toBe(1);
    expect(host.instance()).toBe(mounted);
    expect(carrying.every((region) => regionsBefore.includes(region))).toBe(
      true
    );
  });

  it('connects no live region for an element removed while onBeforeRender is held', async () => {
    const held = deferred();
    const removed = elementHost(() => held.promise);
    await attach(removed);
    await waitFor(() => expect(removed.beforeRenders()).toBe(1), BOOT);
    await detach(removed);
    await act(async () => {
      held.resolve();
    });
    await pause(100);
    expect(removed.afterRenders()).toBe(0);
    expect(liveRegions(removed.element)).toEqual([]);
    // Positive control: an element that stays attached connects and delivers.
    const kept = elementHost();
    await attach(kept);
    await waitFor(() => expect(kept.afterRenders()).toBe(1), BOOT);
    await expectOneDelivery(
      kept.instance(),
      'Lifetime delivery from the kept element',
      kept.element
    );
    expect(liveRegions(removed.element)).toEqual([]);
  });

  it('releases its live regions on removal and delivers through fresh ones when the same element is attached again', async () => {
    const host = elementHost();
    await attach(host);
    await waitFor(() => expect(host.afterRenders()).toBe(1), BOOT);
    const first = host.instance();
    const retired = await expectOneDelivery(
      first,
      'Lifetime delivery before removal',
      host.element
    );
    await detach(host);
    await waitFor(() => expect(liveRegions(host.element)).toEqual([]));
    await attach(host);
    await waitFor(() => expect(host.afterRenders()).toBe(2), BOOT);
    expect(host.instance()).not.toBe(first);
    const fresh = liveRegions(host.element);
    expect(fresh.length).toBeGreaterThan(0);
    expect(retired.some((region) => fresh.includes(region))).toBe(false);
    const carrying = await expectOneDelivery(
      host.instance(),
      'Lifetime delivery after reattach',
      host.element
    );
    expect(carrying.some((region) => retired.includes(region))).toBe(false);
    expect(
      liveRegions(host.element).some((region) =>
        (region.textContent ?? '').includes('Lifetime delivery before removal')
      )
    ).toBe(false);
  });

  it('delivers through one announcer when React StrictMode replays the host and it rerenders', async () => {
    let instance: ChatInstance | undefined;
    let after = 0;
    const props = (assistantName: string) =>
      ({
        openChatByDefault: true,
        assistantName,
        messaging: { skipWelcome: true },
        onBeforeRender: (handed: ChatInstance) => {
          instance = handed;
        },
        onAfterRender: () => {
          after += 1;
        },
      }) as ChatContainerProps;
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <React.StrictMode>
          <ChatContainer {...props('StrictMode host')} />
        </React.StrictMode>
      );
    });
    try {
      await waitFor(() => expect(after).toBe(1), BOOT);
      const mounted = instance;
      await expectOneDelivery(mounted, 'StrictMode delivery before rerender');
      await act(async () => {
        result.rerender(
          <React.StrictMode>
            <ChatContainer {...props('Renamed StrictMode host')} />
          </React.StrictMode>
        );
      });
      await pause(50);
      // The rerender kept the mount.
      expect(after).toBe(1);
      expect(instance).toBe(mounted);
      await expectOneDelivery(mounted, 'StrictMode delivery after rerender');
    } finally {
      await act(async () => result.unmount());
    }
  });
});

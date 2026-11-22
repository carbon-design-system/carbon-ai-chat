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
  MessageState,
  ViewType,
  type ChatContainerProps,
  type ChatInstance,
  type GenericItem,
  type HistoryItem,
} from '../../../aiChatEntry';
import {
  addChunk,
  byRole,
  changeView,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  focusHostButton,
  focusIsInInput,
  inputField,
  mainPanelText,
  partialText,
  pause,
  pickFiles,
  responseOf,
  showUnread,
  textItem,
  textResponse,
} from '../helpers/contract';

/**
 * Longer than the shared announcer's delay before it writes a region. Used
 * only where no later delivery can serve as a barrier. The delay itself is
 * the components package's to test.
 */
const DELIVERY_WINDOW = 300;

type Politeness = 'polite' | 'assertive';

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

/** What the live regions delivered from the moment recording started. */
interface DeliveryLog {
  /** How many times `text` was delivered, in either region or in one. */
  count(text: string, live?: Politeness): number;
  /** The distinct regions that delivered text containing `text`. */
  regionsCarrying(text: string): Set<HTMLElement>;
  stop(): void;
}

/** One write the chat made to a live region. */
interface Delivery {
  region: HTMLElement;
  live: string;
  text: string;
}

/** Records the text each live region shows as the chat writes it. */
function recordDeliveries(): DeliveryLog {
  const deliveries: Delivery[] = [];
  const observers = liveRegions().map((region) => {
    const live = region.getAttribute('aria-live');
    const observer = new MutationObserver(() => {
      const text = region.textContent?.trim();
      if (text) {
        deliveries.push({ region, live, text });
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
    regionsCarrying: (text) =>
      new Set(
        deliveries
          .filter((delivery) => delivery.text.includes(text))
          .map((delivery) => delivery.region)
      ),
    stop: () => observers.forEach((observer) => observer.disconnect()),
  };
}

/**
 * Mounts an open chat with no welcome request and records once its live
 * regions exist. Every owned text is unique, and the mount's own
 * announcements use the default wording, so no wait for them is needed.
 */
async function openRecorded(config: Partial<ChatContainerProps> = {}) {
  const mount = await contractChat({
    openChatByDefault: true,
    ...config,
    messaging: { skipWelcome: true, ...config.messaging },
  });
  await waitFor(() => expect(liveRegions().length).toBeGreaterThan(0));
  return { mount, log: recordDeliveries() };
}

/**
 * Picks files the way `pickFiles` does, and runs `sameTick` in the same
 * synchronous turn as the picker's change event, before any microtask.
 */
async function pickFilesThen(
  buttonName: string,
  files: File[],
  sameTick: () => void
): Promise<void> {
  let picker: HTMLInputElement | undefined;
  const opened = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(() => {});
  try {
    await click(byRole('button', buttonName));
    picker = opened.mock.contexts[0] as HTMLInputElement | undefined;
  } finally {
    opened.mockRestore();
  }
  if (!picker) {
    throw new Error('the upload button opened no file picker');
  }
  await act(async () => {
    Object.defineProperty(picker, 'files', {
      configurable: true,
      value: files,
    });
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    sameTick();
  });
}

let barriers = 0;

/**
 * Adds a completed reply and waits for its delivery. A polite value the chat
 * queued before it goes out in or before the same write.
 */
async function deliverBarrier(
  instance: ChatInstance,
  log: DeliveryLog,
  text: string
): Promise<void> {
  barriers += 1;
  await act(() =>
    instance.messaging.addMessage(textResponse(text, `barrier-${barriers}`))
  );
  await waitFor(() => expect(log.count(text)).toBe(1));
}

describe('public host message announcements', () => {
  contractSetup();

  it('stays silent for a sent request, a partial chunk and loaded history, even when an upsert rewrites that history', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { mount, log } = await openRecorded({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const { instance } = mount;
    try {
      await act(() => instance.send('Silent request words'));
      await addChunk(
        instance,
        partialText('silent-stream', 'part', 'Silent partial words')
      );
      const history: HistoryItem[] = [
        {
          message: textResponse('Silent history words', 'silent-history'),
          time: '2024-01-01T12:00:00.000Z',
        },
      ];
      await act(() => instance.messaging.insertHistory(history));
      await waitFor(() =>
        expect(mainPanelText()).toContain('Silent history words')
      );
      await act(() =>
        instance.messaging.upsertMessage(
          'silent-history',
          MessageState.COMPLETE,
          () => textResponse('Silent rewritten history', 'silent-history')
        )
      );
      await waitFor(() => {
        const shown = mainPanelText();
        expect(shown).toContain('Silent request words');
        expect(shown).toContain('Silent partial words');
        expect(shown).toContain('Silent rewritten history');
      });
      // A later completed reply is a positive barrier for anything queued
      // before it.
      await deliverBarrier(instance, log, 'Announced barrier after silence');
      expect(log.count('Silent request words')).toBe(0);
      expect(log.count('Silent partial words')).toBe(0);
      expect(log.count('Silent history words')).toBe(0);
      expect(log.count('Silent rewritten history')).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('does not announce an upsert that rewrites an announced reply, and announces it again when addMessage replaces it', async () => {
    const { mount, log } = await openRecorded();
    const { instance } = mount;
    const original = 'Original announced wording';
    const rewritten = 'Rewritten unannounced wording';
    const replacement = 'Replacement announced wording';
    try {
      await act(() =>
        instance.messaging.upsertMessage(
          'replaced-reply',
          MessageState.COMPLETE,
          () => textResponse(original, 'replaced-reply')
        )
      );
      await waitFor(() => expect(log.count(original)).toBe(1));
      await act(() =>
        instance.messaging.upsertMessage(
          'replaced-reply',
          MessageState.COMPLETE,
          () => textResponse(rewritten, 'replaced-reply')
        )
      );
      await waitFor(() => expect(mainPanelText()).toContain(rewritten));
      await act(() =>
        instance.messaging.addMessage(
          textResponse(replacement, 'replaced-reply')
        )
      );
      await waitFor(() => expect(mainPanelText()).toContain(replacement));
      // The replacement's delivery is the positive barrier for the rewrite.
      await waitFor(() => expect(log.count(replacement)).toBe(1));
      // Nothing later can be a barrier for a repeat of the replacement.
      await pause(DELIVERY_WINDOW);
      expect(log.count(original)).toBe(1);
      expect(log.count(rewritten)).toBe(0);
      expect(log.count(replacement)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('announces the inline error a failed silent send adds once, and never shows the silent request', async () => {
    const notice = 'Owned silent failure notice';
    const { mount, log } = await openRecorded({
      strings: { errors_singleMessage: notice },
      messaging: {
        customSendMessage: async () => {
          throw new Error('Owned silent send rejected');
        },
      },
    });
    const { instance } = mount;
    try {
      await act(async () => {
        await expect(
          instance.send('Hidden silent question', { silent: true })
        ).rejects.toThrow();
      });
      await waitFor(() => expect(mainPanelText()).toContain(notice));
      await waitFor(() => expect(log.count(notice)).toBe(1));
      await deliverBarrier(instance, log, 'Announced barrier after failure');
      // A repeat the barrier's own render set off would be queued after the
      // barrier, so wait it out.
      await pause(DELIVERY_WINDOW);
      expect(log.count(notice)).toBe(1);
      expect(mainPanelText()).not.toContain('Hidden silent question');
      expect(log.count('Hidden silent question')).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('announces the text a card nests along with its sibling items, each once', async () => {
    const { mount, log } = await openRecorded();
    const { instance } = mount;
    const card = {
      response_type: MessageResponseTypes.CARD,
      body: [textItem('Nested card body words')],
    } as GenericItem;
    try {
      await act(() =>
        instance.messaging.addMessage(
          responseOf('card-reply', [
            textItem('Leading reply words'),
            card,
            textItem('Trailing reply words'),
          ])
        )
      );
      await waitFor(() => expect(log.count('Trailing reply words')).toBe(1));
      await deliverBarrier(instance, log, 'Announced barrier after the card');
      expect(log.count('Leading reply words')).toBe(1);
      expect(log.count('Nested card body words')).toBe(1);
      expect(log.count('Trailing reply words')).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });
});

describe('public host announcement policy', () => {
  contractSetup();

  it('delivers a rejected selection assertively and an ordinary send failure politely, each in its localized wording', async () => {
    const failure = new Error('Owned policy transport rejected');
    const rejected = 'Policy cannot take';
    const failedNotice = 'Policy send failed notice';
    const { mount, log } = await openRecorded({
      strings: {
        input_uploadButtonLabel: 'Policy attach',
        fileSharing_unsupportedType: `${rejected} {filename}`,
        errors_ariaMessageFailed: failedNotice,
      },
      upload: {
        isOn: true,
        accept: '.pdf',
        onFileUpload: async () => ({ fields: [] }),
      },
      messaging: {
        customSendMessage: async () => {
          throw failure;
        },
      },
    });
    const { instance } = mount;
    try {
      await pickFiles('Policy attach', [
        new File(['x'], 'first.txt', { type: 'text/plain' }),
      ]);
      await waitFor(() =>
        expect(log.count(`${rejected} first.txt`, 'assertive')).toBe(1)
      );
      // A second rejection is the assertive barrier for any repeat of the
      // first.
      await pickFiles('Policy attach', [
        new File(['x'], 'second.txt', { type: 'text/plain' }),
      ]);
      await waitFor(() =>
        expect(log.count(`${rejected} second.txt`, 'assertive')).toBe(1)
      );
      await act(async () => {
        await expect(
          instance.messaging.send('Policy failing send')
        ).rejects.toThrow(failure.message);
      });
      await waitFor(() => expect(log.count(failedNotice, 'polite')).toBe(1));
      await deliverBarrier(instance, log, 'Announced barrier after policy');
      expect(log.count(`${rejected} first.txt`)).toBe(1);
      expect(log.count(`${rejected} second.txt`)).toBe(1);
      expect(log.count(rejected, 'polite')).toBe(0);
      expect(log.count(failedNotice)).toBe(1);
      expect(log.count(failedNotice, 'assertive')).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('keeps a polite and an assertive announcement made in the same tick in their own regions', async () => {
    const rejected = 'Same tick cannot take';
    const shortcut = 'Same tick shortcut notice';
    const { mount, log } = await openRecorded({
      // The input announces the shortcut on its first focus, so the chat
      // must not take that focus itself at startup.
      shouldTakeFocusIfOpensAutomatically: false,
      keyboardShortcuts: { messageFocusToggle: { isOn: true } },
      strings: {
        input_uploadButtonLabel: 'Same tick attach',
        fileSharing_unsupportedType: `${rejected} {filename}`,
        input_keyboardShortcutAnnouncement: `${shortcut} {key}`,
      },
      upload: {
        isOn: true,
        accept: '.pdf',
        onFileUpload: async () => ({ fields: [] }),
      },
    });
    const { instance } = mount;
    try {
      expect(focusIsInInput()).toBe(false);
      expect(log.count(shortcut)).toBe(0);
      // The rejection queues an assertive value and the first focus a polite
      // one, in one synchronous turn.
      await pickFilesThen(
        'Same tick attach',
        [new File(['x'], 'tick.txt', { type: 'text/plain' })],
        () => inputField().focus()
      );
      expect(focusIsInInput()).toBe(true);
      await waitFor(() =>
        expect(log.count(`${rejected} tick.txt`, 'assertive')).toBe(1)
      );
      await waitFor(() => expect(log.count(shortcut, 'polite')).toBe(1));
      // A barrier in each channel for any repeat or crossing.
      await pickFiles('Same tick attach', [
        new File(['x'], 'later.txt', { type: 'text/plain' }),
      ]);
      await waitFor(() =>
        expect(log.count(`${rejected} later.txt`, 'assertive')).toBe(1)
      );
      await deliverBarrier(instance, log, 'Announced barrier after one tick');
      expect(log.count(`${rejected} tick.txt`)).toBe(1);
      expect(log.count(rejected, 'polite')).toBe(0);
      expect(log.count(shortcut)).toBe(1);
      expect(log.count(shortcut, 'assertive')).toBe(0);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('announces the keyboard shortcut on the first focus of the input only, not when focus comes back', async () => {
    const shortcut = 'First focus shortcut notice';
    const { mount, log } = await openRecorded({
      // The input announces the shortcut on its first focus, so the chat
      // must not take that focus itself at startup.
      shouldTakeFocusIfOpensAutomatically: false,
      keyboardShortcuts: { messageFocusToggle: { isOn: true } },
      strings: { input_keyboardShortcutAnnouncement: `${shortcut} {key}` },
    });
    const { instance } = mount;
    try {
      expect(focusIsInInput()).toBe(false);
      await act(async () => {
        inputField().focus();
      });
      await waitFor(() => expect(log.count(shortcut, 'polite')).toBe(1));
      await act(async () => {
        focusHostButton();
      });
      expect(focusIsInInput()).toBe(false);
      await act(async () => {
        inputField().focus();
      });
      expect(focusIsInInput()).toBe(true);
      // A later reply is the positive barrier for a second announcement.
      await deliverBarrier(instance, log, 'Announced barrier after refocus');
      expect(log.count(shortcut)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('announces through three polite and two assertive live regions of its own', async () => {
    const reply = 'Regions polite reply';
    const rejected = 'Regions cannot take';
    const { mount, log } = await openRecorded({
      strings: {
        input_uploadButtonLabel: 'Regions attach',
        fileSharing_unsupportedType: `${rejected} {filename}`,
      },
      upload: {
        isOn: true,
        accept: '.pdf',
        onFileUpload: async () => ({ fields: [] }),
      },
    });
    const { instance } = mount;
    try {
      // One delivery more than each count, one at a time, so a different
      // number of regions gives a different number of carrying regions.
      for (const name of ['one', 'two', 'three', 'four']) {
        const text = `${reply} ${name}`;
        await act(() =>
          instance.messaging.addMessage(textResponse(text, `regions-${name}`))
        );
        await waitFor(() => expect(log.count(text, 'polite')).toBe(1));
      }
      for (const name of ['one', 'two', 'three']) {
        await pickFiles('Regions attach', [
          new File(['x'], `${name}.txt`, { type: 'text/plain' }),
        ]);
        await waitFor(() =>
          expect(log.count(`${rejected} ${name}.txt`, 'assertive')).toBe(1)
        );
      }
      expect(log.regionsCarrying(reply).size).toBe(3);
      expect(log.regionsCarrying(rejected).size).toBe(2);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('delivers a stored window announcement once through unrelated updates, then delivers the next one', async () => {
    const opened = 'Dedupe window opened notice';
    const closed = 'Dedupe window closed notice';
    const props = (assistantName: string): Partial<ChatContainerProps> => ({
      openChatByDefault: true,
      assistantName,
      messaging: { skipWelcome: true },
      strings: {
        window_ariaWindowOpened: opened,
        window_ariaWindowClosed: closed,
      },
    });
    // Mounted with the default wording, so a late delivery of what the mount
    // itself announced can't count as one of the owned notices.
    const { mount, log } = await openRecorded({ assistantName: 'Dedupe bot' });
    const { instance } = mount;
    try {
      await mount.rerender(props('Dedupe bot'));
      await changeView(instance, ViewType.LAUNCHER);
      await waitFor(() => expect(log.count(closed)).toBe(1));
      await showUnread(instance, true);
      await showUnread(instance, false);
      await mount.rerender(props('Renamed dedupe bot'));
      await changeView(instance, ViewType.LAUNCHER);
      // The next real change is the positive barrier for any repeat.
      await changeView(instance, ViewType.MAIN_WINDOW);
      await waitFor(() => expect(log.count(opened)).toBe(1));
      // Nothing later can be a barrier for a repeat of the open notice.
      await pause(DELIVERY_WINDOW);
      expect(log.count(closed)).toBe(1);
      expect(log.count(opened)).toBe(1);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });
});

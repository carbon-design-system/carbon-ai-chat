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
  BusEventType,
  type BusEventPreReceive,
  type BusEventReceive,
  type BusEventStateChange,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  mainPanelText,
  outputTexts,
  textResponse,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

function gate() {
  let release: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: (): void => release() };
}

describe('public host state reentry', () => {
  contractSetup();

  it('keeps a published snapshot pinned while a legacy state handler reads its nested public update', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    const live: number[] = [];
    const pinned: number[] = [];
    const deliveries: Array<{
      selected: number;
      snapshot: number;
      live: number;
    }> = [];
    let nested = false;
    const handler = {
      type: BusEventType.STATE_CHANGE as const,
      handler: (event: BusEventStateChange): void => {
        if (!nested && event.newState.isMessageLoadingCounter === 1) {
          nested = true;
          mount.instance.updateIsMessageLoadingCounter('increase');
          live.push(mount.instance.getState().isMessageLoadingCounter);
          pinned.push(mount.instance.state.get().isMessageLoadingCounter);
        }
      },
    };
    const unsubscribe = mount.instance.state.select(
      (state) => state.isMessageLoadingCounter,
      (selected) => {
        deliveries.push({
          selected,
          snapshot: mount.instance.state.get().isMessageLoadingCounter,
          live: mount.instance.getState().isMessageLoadingCounter,
        });
      }
    );
    mount.instance.on(handler);
    try {
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(0);
      await act(async () => {
        mount.instance.updateIsMessageLoadingCounter('increase');
      });
      expect(live).toEqual([2]);
      expect(pinned).toEqual([1]);
      expect(deliveries).toEqual([
        { selected: 1, snapshot: 1, live: 2 },
        { selected: 2, snapshot: 2, live: 2 },
      ]);
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(2);
    } finally {
      unsubscribe();
      mount.instance.off(handler);
      await act(async () => mount.unmount());
    }
  });

  it('keeps a same-ID replacement when its public active-response selection removes a pending final reply', async () => {
    const entered = gate();
    const transport = gate();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => {
          entered.release();
          await transport.promise;
        },
      },
    });
    const beforeReceive: string[][] = [];
    const received: string[][] = [];
    const preHandler = {
      type: BusEventType.PRE_RECEIVE as const,
      handler: (event: BusEventPreReceive): void => {
        beforeReceive.push(outputTexts(event.data));
      },
    };
    const receiveHandler = {
      type: BusEventType.RECEIVE as const,
      handler: (event: BusEventReceive): void => {
        received.push(outputTexts(event.data));
      },
    };
    mount.instance.on([preHandler, receiveHandler]);
    let sending: Promise<void>;
    let replacement: Promise<void>;
    let replaced = false;
    let unsubscribe = (): void => {};
    try {
      // The real stored reply positively controls both receive recorders.
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Original', 'reentry-response')
        )
      );
      await waitFor(() => expect(mainPanelText()).toContain('Original'));
      expect(beforeReceive).toEqual([['Original']]);
      expect(received).toEqual([['Original']]);
      // A real send clears the active-response ID without deleting the reply.
      await act(async () => {
        sending = mount.instance.messaging.send('Hold the current transport');
        sending.catch((): void => {});
        await bounded(entered.promise, 'Real current transport');
      });
      expect(mount.instance.state.get().activeResponseId).toBeNull();
      unsubscribe = mount.instance.state.select(
        (state) => state.activeResponseId,
        (id) => {
          if (!replaced && id === 'reentry-response') {
            replaced = true;
            replacement = mount.instance.messaging
              .removeMessages([id])
              .then(() =>
                mount.instance.messaging.addMessage(
                  textResponse('Replacement', id)
                )
              );
            replacement.catch((): void => {});
          }
        }
      );
      await act(async () => {
        await bounded(
          mount.instance.messaging.addMessageChunk({
            final_response: textResponse('Stale final', 'reentry-response'),
          }),
          'Reentrant final chunk'
        );
        expect(replaced).toBe(true);
        await bounded(replacement, 'Public same-ID replacement');
      });
      await waitFor(() => expect(mainPanelText()).toContain('Replacement'));
      expect(mainPanelText()).not.toContain('Stale final');
      const current = mount.instance.state
        .get()
        .messages.find(({ id }) => id === 'reentry-response');
      expect(current).toBeDefined();
      expect(outputTexts(current)).toEqual(['Replacement']);
      expect(beforeReceive).toEqual([['Original'], ['Replacement']]);
      expect(received).toEqual([['Original'], ['Replacement']]);
      transport.release();
      await act(() => bounded(sending, 'Current transport settlement'));
    } finally {
      unsubscribe();
      mount.instance.off([preHandler, receiveHandler]);
      transport.release();
      await bounded(
        Promise.allSettled([sending, replacement]),
        'Owned reentry cleanup'
      );
      await act(async () => mount.unmount());
    }
  });

  it('keeps calling later state:change handlers and state subscribers after a state:change handler throws', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    const failure = new Error('Host state:change handler failed');
    const later: number[] = [];
    const subscribed: number[] = [];
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    logged.mockClear();
    const throwing = {
      type: BusEventType.STATE_CHANGE as const,
      handler: (): void => {
        throw failure;
      },
    };
    const following = {
      type: BusEventType.STATE_CHANGE as const,
      handler: (event: BusEventStateChange): void => {
        later.push(event.newState.isMessageLoadingCounter);
      },
    };
    mount.instance.on([throwing, following]);
    const unsubscribe = mount.instance.state.subscribe(() => {
      subscribed.push(mount.instance.state.get().isMessageLoadingCounter);
    });
    try {
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(0);
      expect(later).toEqual([]);
      await act(async () => {
        expect(() =>
          mount.instance.updateIsMessageLoadingCounter('increase')
        ).not.toThrow();
      });
      expect(later).toEqual([1]);
      expect(subscribed).toEqual([1]);
      expect(mount.instance.state.get().isMessageLoadingCounter).toBe(1);
      expect(logged).toHaveBeenCalledWith(
        '[Chat] An event handler for state:change threw, so the chat ignored the error and continued.',
        failure
      );
    } finally {
      unsubscribe();
      mount.instance.off([throwing, following]);
      logged.mockRestore();
      await act(async () => mount.unmount());
    }
  });
});

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
  CancellationReason,
  MessageResponseTypes,
  MessageState,
  type BusEventReceive,
  type GenericItem,
  type MessageResponse,
  type PartialItemChunk,
  type PublicChatState,
  type TextItem,
  type TypeAndHandler,
} from '../../../aiChatEntry';
import {
  addChunk,
  advance,
  byRole,
  click,
  contractChat,
  contractSetup,
  deferred,
  responseOf,
  textItem,
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

const REUSED = 'reused-response';
const STOP = 'Stop reused response';
const PAUSE_MS = 50;

function reusedResponse(text: string, requestID: string): MessageResponse {
  return {
    id: REUSED,
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text,
          streaming_metadata: { id: 'text', cancellable: true },
        },
      ],
    },
  };
}

function reusedChunk(text: string, requestID: string): PartialItemChunk {
  return {
    streaming_metadata: { response_id: REUSED, request_id: requestID },
    partial_item: reusedResponse(text, requestID).output.generic[0],
  };
}

/** The reused response's text in a public snapshot, if the snapshot has it. */
function reusedText(state: PublicChatState): string | undefined {
  const message = state.messages.find(({ id }) => id === REUSED) as
    MessageResponse | undefined;
  return (message?.output.generic[0] as TextItem | undefined)?.text;
}

/** A response whose second text item waits behind a pause. */
function pausedResponse(id: string, label: string): MessageResponse {
  return responseOf(id, [
    textItem(`${label} first`, 'first'),
    {
      response_type: MessageResponseTypes.PAUSE,
      time: PAUSE_MS,
    } as GenericItem,
    textItem(`${label} late`, 'late'),
  ]);
}

/** The text of each item the list draws for message `id`. */
function drawnTexts(state: PublicChatState, id: string): string[] {
  return (state.messageItems ?? [])
    .filter(({ messageID }) => messageID === id)
    .map(({ item }) => (item as TextItem).text);
}

describe('public removed response reuse', () => {
  contractSetup();

  it('keeps a reused response ID owned by the new request after Stop and removal', async () => {
    const oldUpdaterEntered = deferred();
    const releaseOldUpdater = deferred();
    const oldWorkFinished = deferred();
    const replacementStreaming = deferred();
    const finishReplacement = deferred();
    const requestIDs: string[] = [];
    let originalSignal: AbortSignal | undefined;
    const mount = await contractChat({
      openChatByDefault: true,
      strings: { input_stopResponse: STOP },
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, options, instance) => {
          requestIDs.push(request.id);
          if (request.input.text === 'Original') {
            originalSignal = options.signal;
            await instance.messaging.upsertMessage(
              REUSED,
              MessageState.STREAMING,
              () => reusedResponse('Original text', request.id)
            );
            await instance.messaging.upsertMessage(
              REUSED,
              MessageState.COMPLETE,
              async () => {
                oldUpdaterEntered.resolve();
                await releaseOldUpdater.promise;
                return reusedResponse('Stale updater', request.id);
              }
            );
            await instance.messaging.addMessageChunk(
              reusedChunk('Stale chunk', request.id)
            );
            oldWorkFinished.resolve();
            return;
          }
          await instance.messaging.addMessageChunk(
            reusedChunk('Replacement', request.id)
          );
          replacementStreaming.resolve();
          await finishReplacement.promise;
          await instance.messaging.addMessageChunk(
            reusedChunk(' continued', request.id)
          );
          await instance.messaging.addMessageChunk({
            final_response: reusedResponse('Replacement continued', request.id),
          });
        },
      },
    });
    const received: BusEventReceive[] = [];
    const receive: TypeAndHandler = {
      type: BusEventType.RECEIVE,
      handler: (event: BusEventReceive): void => {
        received.push(event);
      },
    };
    mount.instance.on(receive);
    let original: Promise<void> | undefined;
    let replacement: Promise<void> | undefined;
    try {
      await act(async () => {
        original = mount.instance.send('Original');
        void original.catch((): void => undefined);
      });
      await bounded(oldUpdaterEntered.promise, 'Old request updater entry');
      const originalSnapshot = mount.instance.state.get();
      expect(originalSnapshot.status).toBe('streaming');
      expect(reusedText(originalSnapshot)).toBe('Original text');

      await waitFor(() => expect(byRole('button', STOP)).toBeEnabled());
      await click(byRole('button', STOP));
      // Remove only once the Stop has reached the original request.
      await waitFor(() => expect(originalSignal?.aborted).toBe(true));
      expect(originalSignal.reason).toBe(CancellationReason.STOP_STREAMING);
      await act(() => mount.instance.messaging.removeMessages([REUSED]));
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );

      await addChunk(
        mount.instance,
        reusedChunk('Late before replacement', requestIDs[0])
      );
      expect(reusedText(mount.instance.state.get())).toBeUndefined();
      expect(mount.instance.state.get().status).toBe('ready');
      expect(received).toEqual([]);

      await act(async () => {
        replacement = mount.instance.send('Replacement');
        void replacement.catch((): void => undefined);
      });
      await bounded(replacementStreaming.promise, 'Replacement stream');
      const replacementSnapshot = mount.instance.state.get();
      expect(replacementSnapshot.status).toBe('streaming');
      expect(reusedText(replacementSnapshot)).toBe('Replacement');

      await act(async () => {
        releaseOldUpdater.resolve();
        await bounded(oldWorkFinished.promise, 'Old request work');
        await bounded(original, 'Old request send');
      });
      expect(mount.instance.state.get().status).toBe('streaming');
      expect(reusedText(mount.instance.state.get())).toBe('Replacement');
      expect(received).toEqual([]);

      await act(async () => {
        finishReplacement.resolve();
        await bounded(replacement, 'Replacement send');
      });
      expect(mount.instance.state.get().status).toBe('ready');
      expect(reusedText(mount.instance.state.get())).toBe(
        'Replacement continued'
      );
      expect(received.map(({ data }) => data.request_id)).toEqual([
        requestIDs[1],
      ]);
      expect(reusedText(originalSnapshot)).toBe('Original text');
      expect(reusedText(replacementSnapshot)).toBe('Replacement');
      expect(Object.isFrozen(originalSnapshot.messages)).toBe(true);
      expect(Object.isFrozen(replacementSnapshot.messages)).toBe(true);
      expect(
        Object.isFrozen(
          replacementSnapshot.messages.find(({ id }) => id === REUSED)
        )
      ).toBe(true);
    } finally {
      releaseOldUpdater.resolve();
      finishReplacement.resolve();
      mount.instance.off(receive);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([original, replacement]),
            'Owned send cleanup'
          );
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it("stops a removed response's paused reveal after the same ID is added again", async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    vi.useFakeTimers();
    try {
      // Positive control: a paused response that stays reveals its later item.
      await act(() =>
        mount.instance.messaging.addMessage(pausedResponse('kept', 'Kept'))
      );
      await advance(0);
      expect(drawnTexts(mount.instance.state.get(), 'kept')).toEqual([
        'Kept first',
      ]);
      await advance(PAUSE_MS);
      expect(drawnTexts(mount.instance.state.get(), 'kept')).toEqual([
        'Kept first',
        'Kept late',
      ]);

      await act(() =>
        mount.instance.messaging.addMessage(
          pausedResponse('removed', 'Removed')
        )
      );
      await advance(0);
      expect(drawnTexts(mount.instance.state.get(), 'removed')).toEqual([
        'Removed first',
      ]);
      await act(() => mount.instance.messaging.removeMessages(['removed']));
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Fresh replacement', 'removed')
        )
      );
      await advance(PAUSE_MS);
      expect(drawnTexts(mount.instance.state.get(), 'removed')).toEqual([
        'Fresh replacement',
      ]);
      expect(
        mount.instance.state.get().messages.find(({ id }) => id === 'removed')
      ).toMatchObject({
        output: { generic: [{ text: 'Fresh replacement' }] },
      });
    } finally {
      await act(async () => mount.unmount());
    }
  });
});

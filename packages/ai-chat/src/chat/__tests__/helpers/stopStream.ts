/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  BusEventType,
  MessageResponseTypes,
  MessageState,
  type ChatInstance,
  type PartialResponse,
} from '../../../aiChatEntry';
import { contractChat, type ContractMount } from './contract';

/** How a stream reaches the chat: chunk calls, or `upsertMessage`. */
type StreamRoute = 'addMessageChunk' | 'upsertMessage';

/** Both stream routes, for `describe.each`. */
export const STREAM_ROUTES: StreamRoute[] = [
  'addMessageChunk',
  'upsertMessage',
];

/** A stream that writes one text item and counts stop events. */
interface CancellableStream {
  mount: ContractMount;
  instance: ChatInstance;
  /** How many `stopStreaming` events have fired. */
  stopEvents: () => number;
  /** Settles the promise every stop handler returned. */
  releaseStop: () => void;
  /**
   * Writes the item with this `cancellable` flag (left off for `undefined`).
   * `terminal` ends it: COMPLETE or a `complete_item`, ERROR or a
   * `final_response`.
   */
  write: (
    cancellable: boolean | undefined,
    terminal?: 'complete' | 'error'
  ) => Promise<void>;
}

/**
 * Opens a chat whose `customSendMessage` never settles, and returns a stream
 * that writes one response through `route`. With `immediate`, it sends a
 * message first, so `showStopButtonImmediately` shows the stop button.
 */
export async function startCancellableStream(
  route: StreamRoute,
  immediate = false
): Promise<CancellableStream> {
  const mount = await contractChat({
    openChatByDefault: true,
    messaging: {
      showStopButtonImmediately: immediate,
      skipWelcome: true,
      customSendMessage: () => new Promise<void>(() => {}),
    },
  });
  const { instance } = mount;
  let stopEvents = 0;
  let releaseStop = () => {};
  const stopped = new Promise<void>((resolve) => {
    releaseStop = resolve;
  });
  instance.on({
    type: BusEventType.STOP_STREAMING,
    handler: () => {
      stopEvents++;
      return stopped;
    },
  });
  if (immediate) {
    await act(async () => {
      void instance.messaging.send('Start streaming');
    });
  }
  const write: CancellableStream['write'] = (cancellable, terminal) => {
    const item = {
      response_type: MessageResponseTypes.TEXT,
      text: 'Streaming answer',
      streaming_metadata: {
        id: 'stop-item',
        ...(cancellable === undefined ? {} : { cancellable }),
      },
    };
    const message = { id: 'stop-response', output: { generic: [item] } };
    // The chunks name their response as the demo's stream did, through an
    // `id` the PartialResponse type doesn't declare.
    const partialResponse = { id: message.id } as unknown as PartialResponse;
    return act(async () => {
      if (route === 'upsertMessage') {
        const states = {
          complete: MessageState.COMPLETE,
          error: MessageState.ERROR,
        };
        await instance.messaging.upsertMessage(
          message.id,
          terminal ? states[terminal] : MessageState.STREAMING,
          () => message
        );
      } else if (terminal === 'error') {
        await instance.messaging.addMessageChunk({ final_response: message });
      } else if (terminal === 'complete') {
        await instance.messaging.addMessageChunk({
          partial_response: partialResponse,
          complete_item: item,
        });
      } else {
        await instance.messaging.addMessageChunk({
          partial_response: partialResponse,
          partial_item: item,
        });
      }
    });
  };
  return {
    mount,
    instance,
    stopEvents: () => stopEvents,
    releaseStop: () => releaseStop(),
    write,
  };
}

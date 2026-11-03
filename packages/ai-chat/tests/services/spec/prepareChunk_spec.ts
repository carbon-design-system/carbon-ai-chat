/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IncomingMessageService } from '../../../src/chat/services/messaging/inbound/IncomingMessageService';
import { ChunkProcessingService } from '../../../src/chat/services/messaging/inbound/ChunkProcessingService';
import type { MessageWriteOptions } from '../../../src/chat/store/messageWriteTypes';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import {
  MessageResponseTypes,
  type MessageResponse,
  type PartialItemChunk,
  type GenericItem,
  type TextItem,
} from '../../../src/types/messaging/Messages';
import type { DeepPartial } from '../../../src/types/utilities/DeepPartial';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';

const incoming = new IncomingMessageService();
function chunk(): PartialItemChunk {
  return {
    streaming_metadata: { response_id: 'response' },
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      text: 'first',
      streaming_metadata: { id: 'item' },
    },
    partial_response: {
      message_options: { reasoning: { content: 'thinking' } },
    },
  };
}

it('owns only the item and partial response while retaining the original event chunk', () => {
  const original = chunk();
  const { ownedItem, ownedChunk } = incoming.prepareChunkValues(
    original,
    original.partial_item
  );
  expect(ownedItem).not.toBe(original.partial_item);
  expect(ownedChunk).not.toBe(original);
  expect(ownedChunk.partial_response).not.toBe(original.partial_response);
  expect((ownedChunk as PartialItemChunk).partial_item).toBe(
    original.partial_item
  );
  expect(ownedChunk.streaming_metadata).toBe(original.streaming_metadata);
  (original.partial_item as DeepPartial<TextItem>).text = 'later';
  original.partial_response.message_options.reasoning.content = 'later';
  expect((ownedItem as DeepPartial<TextItem>).text).toBe('first');
  expect(ownedChunk.partial_response.message_options.reasoning.content).toBe(
    'thinking'
  );
});

it('never inspects sibling items when returning or copying a prior message', () => {
  const generic: GenericItem[] = [];
  Object.defineProperty(generic, 0, {
    get: () => {
      throw new Error('sibling scanned');
    },
    enumerable: true,
  });
  Object.freeze(generic);
  const prior: MessageResponse = Object.freeze({
    id: 'response',
    output: Object.freeze({ generic }),
    history: Object.freeze({ timestamp: 1 }),
  });
  const delta = chunk();
  delete delta.partial_response;
  expect(incoming.applyChunkData(prior, delta, 'response', undefined)).toBe(
    prior
  );
  const merged = incoming.applyChunkData(prior, chunk(), 'response', undefined);
  expect(merged.output).toBe(prior.output);
  expect(merged.history).toBe(prior.history);
});

it('ignores other partial-response fields and uses only the supplied first timestamp', () => {
  const delta = chunk();
  Object.assign(delta.partial_response, {
    id: 'ignored',
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: 'ignored' }],
    },
  });
  const result = incoming.applyChunkData(undefined, delta, 'response', 456);
  expect(result.id).toBe('response');
  expect(result.output.generic).toEqual([]);
  expect(result.history.timestamp).toBe(456);
});

it('reads the clock only inside the queued updater when the response is absent', async () => {
  const release = resolvablePromise<void>();
  let queuedUpdater!: (
    previous: MessageResponse | undefined
  ) => MessageResponse;
  const upsert = jest.fn(
    (
      _id: string,
      _state: unknown,
      updater: typeof queuedUpdater,
      _options: MessageWriteOptions
    ) => {
      queuedUpdater = updater;
      return release;
    }
  );
  const service = new ChunkProcessingService({
    messageCoordinator: { upsertMessage: upsert },
  } as unknown as ServiceManager);
  // Exercise the workflow seam; public route/lifetime suites remain unchanged.
  const commit = service as unknown as {
    commitStreamingChunk(
      chunk: PartialItemChunk,
      id: string,
      item: DeepPartial<GenericItem>,
      complete: boolean,
      current: () => boolean,
      requestID: string
    ): Promise<DeepPartial<GenericItem>>;
  };
  const now = jest.spyOn(Date, 'now').mockReturnValue(10);
  try {
    const delta = chunk();
    const work = commit.commitStreamingChunk(
      delta,
      'response',
      delta.partial_item,
      false,
      () => true,
      'request'
    );
    expect(now).not.toHaveBeenCalled();
    delta.partial_response.message_options.reasoning.content = 'caller edit';
    now.mockReturnValue(20);
    const result = queuedUpdater(undefined);
    expect(result.history.timestamp).toBe(20);
    expect(result.message_options.reasoning.content).toBe('thinking');
    expect(now).toHaveBeenCalledTimes(1);
    queuedUpdater(result);
    expect(now).toHaveBeenCalledTimes(1);
    const options = upsert.mock.calls[0][3];
    expect(options.origin).toBe('chunk');
    expect(options.chunk.requestID).toBe('request');
    expect(options.chunk.item).not.toBe(delta.partial_item);
    release.doResolve();
    expect(await work).toBe(options.chunk.item);
  } finally {
    release.doResolve();
    now.mockRestore();
  }
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IncomingMessageService } from '../IncomingMessageService';

import {
  MessageResponseTypes,
  type MessageResponse,
  type PartialItemChunk,
  type GenericItem,
} from '../../../../../types/messaging/Messages';

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

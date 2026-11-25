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
  type BusEventChunkUserDefinedResponse,
  type PublicChatState,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  finalChunk,
  outputTexts,
  partialText,
  textItem,
} from '../helpers/contract';

function responseIn(state: PublicChatState, id: string) {
  const message = state.messages.find((value) => value.id === id);
  if (!message || !('output' in message)) {
    throw new Error(`Expected public response ${id}`);
  }
  return message;
}

function entryIn(state: PublicChatState, streamID: string) {
  const entry = state.messageItems.find(
    ({ id }) => id === `shared-legacy:s:${streamID}`
  );
  if (!entry) {
    throw new Error(`Expected public streaming item ${streamID}`);
  }
  return entry;
}

describe('public legacy chunk snapshot ownership', () => {
  contractSetup();

  it('captures the unread snapshot before a real mutable chunk callback changes its payload', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    let retained: PublicChatState;
    const handler = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE as const,
      handler: (event: BusEventChunkUserDefinedResponse): void => {
        retained = mount.instance.state.get();
        event.data.messageItem.user_defined.value = 'After consumer edit';
      },
    };
    mount.instance.on(handler);
    const item = (value: string) => ({
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value },
      streaming_metadata: { id: 'widget' },
    });
    try {
      await addChunk(mount.instance, {
        streaming_metadata: { response_id: 'mutable-legacy' },
        partial_item: item('Before consumer edit'),
      });
      expect(retained).toBeDefined();
      // First read of retained.messages deliberately follows the mutable callback.
      const before = responseIn(retained, 'mutable-legacy');
      const current = responseIn(mount.instance.state.get(), 'mutable-legacy');
      expect(before.output.generic[0].user_defined.value).toBe(
        'Before consumer edit'
      );
      expect(current.output.generic[0].user_defined.value).toBe(
        'After consumer edit'
      );
      expect(Object.isFrozen(retained.messages)).toBe(true);
      await addChunk(
        mount.instance,
        finalChunk('mutable-legacy', [item('After consumer edit')])
      );
    } finally {
      mount.instance.off(handler);
      await act(async () => mount.unmount());
    }
  });

  it('retains untouched legacy message and item references through a partial edit and later item completion', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    try {
      await addChunk(
        mount.instance,
        partialText('unchanged-legacy', 'control', 'Control reply')
      );
      await addChunk(
        mount.instance,
        finalChunk('unchanged-legacy', [textItem('Control reply', 'control')])
      );
      for (const [id, text] of [
        ['a', 'A'],
        ['b', 'B'],
        ['c', 'C'],
      ]) {
        await addChunk(mount.instance, partialText('shared-legacy', id, text));
      }
      const before = mount.instance.state.get();
      const control = responseIn(before, 'unchanged-legacy');
      const a = entryIn(before, 'a');
      const b = entryIn(before, 'b');
      const c = entryIn(before, 'c');
      await addChunk(
        mount.instance,
        partialText('shared-legacy', 'b', ' more')
      );
      const edited = mount.instance.state.get();
      expect(responseIn(edited, 'unchanged-legacy')).toBe(control);
      expect(entryIn(edited, 'a')).toBe(a);
      expect(entryIn(edited, 'c')).toBe(c);
      expect(entryIn(edited, 'b')).not.toBe(b);
      expect(outputTexts(responseIn(edited, 'shared-legacy'))).toEqual([
        'A',
        'B more',
        'C',
      ]);
      const retainedB = entryIn(edited, 'b');

      await addChunk(mount.instance, {
        streaming_metadata: { response_id: 'shared-legacy' },
        complete_item: textItem('A complete', 'a'),
      });
      await addChunk(
        mount.instance,
        partialText('shared-legacy', 'c', ' more')
      );
      const completed = mount.instance.state.get();
      expect(entryIn(completed, 'b')).toBe(retainedB);
      const completeResponse = responseIn(completed, 'shared-legacy');
      for (const id of ['a', 'c']) {
        const item = completeResponse.output.generic.find(
          (value) => value.streaming_metadata?.id === id
        );
        expect(entryIn(completed, id).item).toBe(item);
      }
      expect(outputTexts(completeResponse)).toEqual([
        'A complete',
        'B more',
        'C more',
      ]);
      expect(outputTexts(responseIn(before, 'shared-legacy'))).toEqual([
        'A',
        'B',
        'C',
      ]);
      await addChunk(
        mount.instance,
        finalChunk('shared-legacy', [
          textItem('A complete', 'a'),
          textItem('B more', 'b'),
          textItem('C more', 'c'),
        ])
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});

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
  MessageResponse,
  MessageResponseTypes,
  PartialItemChunk,
  TextItem,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

describe('shared chunk storage and public messages', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each([false, true])(
    'keeps stored identity while protecting an earlier snapshot (read early: %p)',
    async (readEarly) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const chunk = (text: string): PartialItemChunk => ({
        streaming_metadata: { response_id: 'stable' },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text,
          streaming_metadata: { id: 'text' },
        },
      });
      await act(async () => {
        await instance.messaging.addMessageChunk(chunk('Hello'));
      });
      const stored = store.getState().allMessagesByID.stable;
      const messageMap = store.getState().allMessagesByID;
      const before = instance.state.get();
      const textOf = (messages: readonly unknown[]) =>
        (
          (
            messages.find(
              (message: MessageResponse) => message.id === 'stable'
            ) as MessageResponse
          ).output.generic[0] as TextItem
        ).text;
      if (readEarly) {
        expect(textOf(before.messages)).toBe('Hello');
      }
      await act(async () => {
        await instance.messaging.addMessageChunk(chunk(' world'));
      });
      const after = instance.state.get();
      expect(store.getState().allMessagesByID.stable).toBe(stored);
      expect(store.getState().allMessagesByID).toBe(messageMap);
      expect(textOf(after.messages)).toBe('Hello world');
      expect(textOf(before.messages)).toBe('Hello');
      expect(Object.isFrozen(before.messages)).toBe(true);
      expect(
        Object.isFrozen(
          before.messages.find((message) => message.id === 'stable')
        )
      ).toBe(true);
    }
  );
});

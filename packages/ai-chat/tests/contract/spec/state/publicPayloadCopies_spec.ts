/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { MessageResponse, MessageState } from '../../../../src/aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  partialUserDefined,
  userDefinedItem,
} from '../../helpers';

// @covers instance.messaging.upsertMessage instance.messaging.addMessageChunk state.messages state.messageItems
describe('public copies of user-defined payloads', () => {
  contractSetup();

  it.each(['complete', 'streaming'])(
    'freezes the copied container while a %s item keeps its host class unfrozen',
    async (mode) => {
      const { instance } = await contractChat({
        messaging: { skipWelcome: true },
        renderUserDefinedResponse: () => null,
      });
      class Widget {}
      const source = Object.assign(Widget, { settings: { label: 'before' } });
      const id = `opaque-${mode}`;
      if (mode === 'complete') {
        await act(async () => {
          await instance.messaging.upsertMessage(
            id,
            MessageState.COMPLETE,
            () => ({
              id,
              output: { generic: [userDefinedItem('a', { Widget: source })] },
            })
          );
        });
      } else {
        await addChunk(
          instance,
          partialUserDefined(id, 'a', { Widget: source })
        );
      }

      const state = instance.getState();
      const message = state.messages.find(
        (entry) => entry.id === id
      ) as MessageResponse;
      const entry = state.messageItems.find((item) => item.messageID === id);
      const messagePayload = message.output.generic[0].user_defined;
      const itemPayload = entry.item.user_defined;
      expect(Object.isFrozen(messagePayload)).toBe(true);
      expect(Object.isFrozen(itemPayload)).toBe(true);
      expect(messagePayload.Widget).toBe(source);
      expect(itemPayload.Widget).toBe(source);
      expect(Object.isFrozen(source)).toBe(false);
      expect(Object.isFrozen(source.settings)).toBe(false);
      source.settings.label = 'after';
      expect(source.settings.label).toBe('after');
    }
  );
});

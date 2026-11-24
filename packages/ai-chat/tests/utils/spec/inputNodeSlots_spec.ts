/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  collectSlotEntries,
  inputNodeIdentity,
} from '../../../src/chat/utils/inputNodeSlots';
import type { MessageRequest } from '../../../src/types/messaging/Messages';

it('preserves node identity when equal attributes have different key order', () => {
  const message: MessageRequest = {
    id: 'message',
    input: {
      text: 'Ada',
      display_content: {
        type: 'doc',
        content: [{ type: 'mention', attrs: { id: 'ada', label: 'Ada' } }],
      },
    },
  };
  const previous = collectSlotEntries({ message });
  const updated: MessageRequest = {
    ...message,
    input: {
      ...message.input,
      display_content: {
        type: 'doc',
        content: [{ attrs: { label: 'Ada', id: 'ada' }, type: 'mention' }],
      },
    },
  };

  const [next] = collectSlotEntries({ message: updated }, previous);

  expect(next.state.node).toEqual(previous[0].state.node);
  expect(next.state.message).toBe(updated);
  expect(inputNodeIdentity(next.state)).toBe(
    inputNodeIdentity(previous[0].state)
  );
});

it('replaces node identity when its type changes with unchanged attributes', () => {
  const message: MessageRequest = {
    id: 'message',
    input: {
      text: 'Ada',
      display_content: {
        type: 'doc',
        content: [{ type: 'mention', attrs: { id: 'ada', label: 'Ada' } }],
      },
    },
  };
  const previous = collectSlotEntries({ message });
  const updated = JSON.parse(JSON.stringify(message));
  updated.input.display_content.content[0].type = 'command';

  const [next] = collectSlotEntries({ message: updated }, previous);

  expect(inputNodeIdentity(next.state)).not.toBe(
    inputNodeIdentity(previous[0].state)
  );
});

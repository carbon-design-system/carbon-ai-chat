/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { handleCustomFooterSlot } from '../../../src/chat/services/messaging/coordinateMessageEvents';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import {
  MessageResponseTypes,
  type MessageResponse,
  type UserDefinedItem,
} from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import type { AppStateMessages } from '../../../src/types/state/AppState';
import { type BusEventCustomFooterSlot } from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';

function fixture() {
  const item: UserDefinedItem = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { text: 'before' },
    message_item_options: {
      custom_footer_slot: {
        slot_name: 'footer',
        additional_data: { label: 'data' },
      },
    },
  };
  const message: MessageResponse = {
    id: 'response',
    output: { generic: [item] },
  };
  const local = {
    item,
    fullMessageID: message.id,
    ui_state: { id: 'local' },
  } as LocalMessageItem;
  const state = {
    allMessagesByID: { response: message },
    allMessageItemsByID: { local },
    assistantMessageState: { localMessageIDs: ['local'] },
  } as unknown as AppStateMessages;
  const release = jest.fn();
  let valid = true;
  const dispatch = jest.fn();
  const fire = jest.fn(async (_event: unknown, _guard?: () => boolean) => {});
  const manager = {
    restartCount: 0,
    store: { getState: () => state, dispatch },
    fire,
    messageUpsertCoordinator: {
      trackWrite: jest.fn(() => ({ isCurrent: () => valid, release })),
    },
  } as unknown as ServiceManager;
  return {
    manager,
    state,
    item,
    message,
    local,
    fire,
    dispatch,
    release,
    invalidate: () => {
      valid = false;
    },
  };
}

it.each(['commit', 'invalidate', 'restart', 'commit throws'])(
  'keeps footer writeback and release after rejection: %s',
  async (mode) => {
    const f = fixture();
    const pending = resolvablePromise<void>();
    const hostFailure = new Error('host failure');
    const commitFailure = new Error('commit failure');
    f.fire.mockReturnValue(pending);
    const work = handleCustomFooterSlot(f.manager, f.local, f.message);
    const event = f.fire.mock.calls[0][0] as BusEventCustomFooterSlot;
    expect(event.data.slotName).toBe('footer');
    expect(event.data.messageItem).toBe(event.data.message.output.generic[0]);
    expect(event.data.message).not.toBe(f.message);
    (event.data.messageItem as UserDefinedItem).user_defined.text = 'edited';
    if (mode === 'invalidate') {
      f.invalidate();
    }
    if (mode === 'restart') {
      f.manager.restartCount++;
    }
    if (mode === 'commit throws') {
      f.dispatch.mockImplementation(() => {
        throw commitFailure;
      });
    }
    pending.doReject(hostFailure);
    await expect(work).rejects.toBe(
      mode === 'commit throws' ? commitFailure : hostFailure
    );
    expect(f.release).toHaveBeenCalledTimes(1);
    expect(f.item.user_defined.text).toBe('before');
    expect(f.dispatch).toHaveBeenCalledTimes(
      mode === 'commit' ? 2 : mode === 'commit throws' ? 1 : 0
    );
  }
);

it('fires a frozen footer without capture and keeps supplied metadata aliases', async () => {
  const f = fixture();
  Object.freeze(f.message);
  await handleCustomFooterSlot(f.manager, f.local, f.message);
  const event = f.fire.mock.calls[0][0] as BusEventCustomFooterSlot;
  expect(event.data.message).toBe(f.message);
  expect(event.data.additionalData).toBe(
    f.item.message_item_options.custom_footer_slot.additional_data
  );
  expect(f.manager.messageUpsertCoordinator.trackWrite).not.toHaveBeenCalled();
});

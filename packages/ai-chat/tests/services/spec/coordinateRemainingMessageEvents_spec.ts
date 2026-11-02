/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  handleUserDefinedResponseItemsChunk,
  handleCustomFooterSlot,
  handleCustomRequestFooterSlot,
  createElementsForUserDefinedResponses,
  replayFooterSlots,
} from '../../../src/chat/services/messaging/coordinateMessageEvents';
import type { MessagePresentationPort } from '../../../src/chat/services/messaging/presentationPort';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import {
  MessageResponseTypes,
  type MessageResponse,
  type MessageRequest,
  type UserDefinedItem,
  type PartialItemChunk,
} from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import type { AppStateMessages } from '../../../src/types/state/AppState';
import {
  BusEventType,
  type BusEventCustomFooterSlot,
} from '../../../src/types/events/eventBusTypes';
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

it.each([false, true])(
  'awaits chunk callbacks with adapter=%s and preserves original event aliases',
  async (mounted) => {
    const f = fixture();
    const pending = resolvablePromise<void>();
    f.fire.mockReturnValue(pending);
    const slot = jest.fn(() => 'slot');
    const presentation = mounted
      ? ({
          getUserDefinedResponseSlot: slot,
        } as unknown as MessagePresentationPort)
      : undefined;
    const chunk: PartialItemChunk = { partial_item: f.item };
    const work = handleUserDefinedResponseItemsChunk(
      f.manager,
      presentation,
      'response',
      chunk,
      f.item
    );
    const event = f.fire.mock.calls[0][0] as {
      data: { chunk: unknown; messageItem: unknown; slot: string };
    };
    expect(event.data.chunk).toBe(chunk);
    expect(event.data.messageItem).toBe(f.item);
    expect(event.data.slot).toBe(mounted ? 'slot' : undefined);
    let done = false;
    work.then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(done).toBe(false);
    pending.doResolve();
    await work;
    expect(
      f.manager.messageUpsertCoordinator.trackWrite
    ).not.toHaveBeenCalled();
  }
);

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

it('derives request footer names without a view and awaits handlers, except silent requests', async () => {
  const f = fixture();
  const request: MessageRequest = {
    id: 'request',
    input: { text: 'hello' },
    history: {},
  };
  const local = {
    ...f.local,
    item: { response_type: MessageResponseTypes.TEXT, text: 'hello' },
  } as LocalMessageItem;
  const pending = resolvablePromise<void>();
  f.fire.mockReturnValue(pending);
  const work = handleCustomRequestFooterSlot(f.manager, local, request);
  expect(f.fire).toHaveBeenCalledWith({
    type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    data: { slotName: 'request-footer-local', message: request },
  });
  let done = false;
  work.then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  pending.doResolve();
  await work;
  request.history.silent = true;
  await handleCustomRequestFooterSlot(f.manager, local, request);
  expect(f.fire).toHaveBeenCalledTimes(1);
});

it('keeps response history recursion separate from visible footer order', async () => {
  const f = fixture();
  const child = f.local;
  const parent = {
    ...child,
    ui_state: { id: 'parent', itemsLocalMessageItemIDs: ['local'] },
    item: { response_type: MessageResponseTypes.CAROUSEL, items: [f.item] },
  } as LocalMessageItem;
  const other = {
    ...child,
    item: { ...f.item, user_defined: { text: 'other' } },
    ui_state: { id: 'other' },
  };
  f.state.allMessageItemsByID = { parent, local: child, other };
  f.state.assistantMessageState.localMessageIDs = ['other', 'missing', 'local'];
  Object.freeze(f.message);
  await createElementsForUserDefinedResponses(f.manager, undefined, f.state);
  expect(
    f.fire.mock.calls.map(([event]) => (event as { type: string }).type)
  ).toEqual([
    BusEventType.USER_DEFINED_RESPONSE,
    BusEventType.USER_DEFINED_RESPONSE,
    BusEventType.USER_DEFINED_RESPONSE,
  ]);
  f.fire.mockClear();
  await replayFooterSlots(f.manager, f.state);
  expect(f.fire.mock.calls).toHaveLength(2);
  expect(
    f.fire.mock.calls.map(
      ([event]) => (event as BusEventCustomFooterSlot).data.messageItem
    )
  ).toEqual([other.item, child.item]);
});

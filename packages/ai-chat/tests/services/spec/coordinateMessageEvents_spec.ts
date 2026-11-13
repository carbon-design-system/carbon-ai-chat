/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { coordinateUserDefinedResponseItems } from '../../../src/shared/services/messaging/coordinateMessageEvents';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { BusEventUserDefinedResponse } from '../../../src/types/events/eventBusTypes';

function deferred() {
  let resolve: () => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {
    promise,
    resolve: () => resolve(),
    reject: (reason: unknown) => reject(reason),
  };
}

function fixture() {
  const item = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { text: 'before' },
  };
  const message: MessageResponse = {
    id: 'response',
    output: { generic: [item] },
  };
  const local = {
    fullMessageID: message.id,
    item,
    ui_state: { id: 'local' },
  } as LocalMessageItem;
  let state: {
    allMessagesByID: Record<string, MessageResponse>;
    allMessageItemsByID: Record<string, LocalMessageItem>;
  } = {
    allMessagesByID: { [message.id]: message },
    allMessageItemsByID: { local },
  };
  let current = true;
  const release = jest.fn();
  const dispatch = jest.fn();
  const fire = jest.fn(
    async (_event: BusEventUserDefinedResponse, _guard?: () => boolean) => {}
  );
  const manager = {
    restartCount: 0,
    store: { getState: () => state, dispatch },
    fire,
    messageCoordinator: {
      trackIncomingWrite: jest.fn(() => ({
        isCurrent: () => current,
        release,
      })),
    },
  } as unknown as ServiceManager;
  return {
    manager,
    message,
    local,
    removeMessages: () => {
      state = { allMessagesByID: {}, allMessageItemsByID: {} };
    },
    fire,
    dispatch,
    release,
    invalidate: () => {
      current = false;
    },
  };
}

// These tests use the real captureMessageEvent implementation; no writeback mock.
describe.each([false, true])(
  'response-tree events with adapter=%s',
  (withAdapter) => {
    function port(slot: jest.Mock): MessagePresentationPort | undefined {
      return withAdapter
        ? ({
            getUserDefinedResponseSlot: slot,
          } as unknown as MessagePresentationPort)
        : undefined;
    }

    it('awaits frozen notifications without recapture and retains payload aliases', async () => {
      const f = fixture();
      Object.freeze(f.local.item.user_defined);
      Object.freeze(f.local.item);
      Object.freeze(f.message.output.generic);
      Object.freeze(f.message.output);
      Object.freeze(f.message);
      const pending = deferred();
      const slot = jest.fn(() => 'slot');
      f.fire.mockImplementation(() => pending.promise);
      let done = false;
      const work = coordinateUserDefinedResponseItems(
        f.manager,
        port(slot),
        f.local,
        f.message,
        MessageState.COMPLETE
      ).then(() => {
        done = true;
      });
      const event = f.fire.mock.calls[0][0];
      expect(event.data.message).toBe(f.local.item);
      expect(event.data.fullMessage).toBe(f.message);
      expect(event.data.message).toBe(f.message.output.generic[0]);
      expect(event.data.state).toBe(MessageState.COMPLETE);
      expect(event.data.slot).toBe(withAdapter ? 'slot' : undefined);
      await Promise.resolve();
      expect(done).toBe(false);
      pending.resolve();
      await work;
      expect(
        f.manager.messageCoordinator.trackIncomingWrite
      ).not.toHaveBeenCalled();
      expect(f.dispatch).not.toHaveBeenCalled();
    });

    it('commits detached legacy edits on rejection and releases the tracked write', async () => {
      const f = fixture();
      const pending = deferred();
      const failure = new Error('host rejection');
      f.fire.mockImplementation(() => pending.promise);
      const work = coordinateUserDefinedResponseItems(
        f.manager,
        port(jest.fn()),
        f.local,
        f.message
      );
      const event = f.fire.mock.calls[0][0];
      expect(event.data.fullMessage).not.toBe(f.message);
      expect(event.data.message).toBe(
        (event.data.fullMessage as MessageResponse).output.generic[0]
      );
      event.data.message.user_defined.text = 'edited';
      expect(f.local.item.user_defined.text).toBe('before');
      pending.reject(failure);
      await expect(work).rejects.toBe(failure);
      expect(f.dispatch).toHaveBeenCalledTimes(2);
      const committed = f.dispatch.mock.calls[0][0].message as MessageResponse;
      expect(committed.output.generic[0].user_defined.text).toBe('edited');
      expect(committed).not.toBe(event.data.fullMessage);
      expect(f.release).toHaveBeenCalledTimes(1);
    });

    it.each(['write invalidated', 'restart', 'removed'])(
      'rejects stale writes after %s during a pending callback',
      async (cause) => {
        const f = fixture();
        const pending = deferred();
        f.fire.mockImplementation(() => pending.promise);
        const work = coordinateUserDefinedResponseItems(
          f.manager,
          port(jest.fn()),
          f.local,
          f.message
        );
        f.fire.mock.calls[0][0].data.message.user_defined.text = 'edited';
        if (cause === 'write invalidated') {
          f.invalidate();
        }
        if (cause === 'restart') {
          f.manager.restartCount++;
        }
        if (cause === 'removed') {
          f.removeMessages();
        }
        pending.resolve();
        await work;
        expect(f.dispatch).not.toHaveBeenCalled();
        expect(f.release).toHaveBeenCalledTimes(1);
      }
    );

    it('releases even when committing a legacy edit throws', async () => {
      const f = fixture();
      const failure = new Error('dispatch failed');
      f.fire.mockImplementation(async (event) => {
        event.data.message.user_defined.text = 'edited';
      });
      f.dispatch.mockImplementation(() => {
        throw failure;
      });
      await expect(
        coordinateUserDefinedResponseItems(
          f.manager,
          port(jest.fn()),
          f.local,
          f.message
        )
      ).rejects.toBe(failure);
      expect(f.release).toHaveBeenCalledTimes(1);
    });

    it('delivers silent events without allocating a slot', async () => {
      const f = fixture();
      f.local.item.user_defined.silent = true;
      const slot = jest.fn(() => 'slot');
      await coordinateUserDefinedResponseItems(
        f.manager,
        port(slot),
        f.local,
        f.message
      );
      expect(f.fire).toHaveBeenCalledTimes(1);
      expect(f.fire.mock.calls[0][0].data.slot).toBeUndefined();
      expect(slot).not.toHaveBeenCalled();
    });

    it.each([false, true])(
      'walks grid/items/body/footer sequentially and checks cancellation=%s',
      async (cancel) => {
        const f = fixture();
        const ids = ['grid1', 'grid2', 'items', 'body', 'footer'];
        const locals: Record<string, LocalMessageItem> = {};
        ids.forEach((id) => {
          locals[id] = {
            ...f.local,
            ui_state: { ...f.local.ui_state, id },
            item: { ...f.local.item, user_defined: { id } },
          };
        });
        const root = {
          ...f.local,
          item: { response_type: MessageResponseTypes.GRID },
          ui_state: {
            ...f.local.ui_state,
            id: 'root',
            gridLocalMessageItemIDs: [[['grid1', 'grid2']]],
            itemsLocalMessageItemIDs: ['items'],
            bodyLocalMessageItemIDs: ['body'],
            footerLocalMessageItemIDs: ['footer'],
          },
        } as LocalMessageItem;
        Object.freeze(f.message);
        const pending = deferred();
        const trace: unknown[] = [];
        let current = true;
        f.fire.mockImplementation(async (event) => {
          trace.push(event.data.message.user_defined.id);
          if (trace.length === 1) {
            await pending.promise;
          }
        });
        const work = coordinateUserDefinedResponseItems(
          f.manager,
          port(jest.fn()),
          root,
          f.message,
          undefined,
          locals,
          () => current
        );
        expect(trace).toEqual(['grid1']);
        if (cancel) {
          current = false;
        }
        pending.resolve();
        await work;
        expect(trace).toEqual(cancel ? ['grid1'] : ids);
      }
    );
  }
);

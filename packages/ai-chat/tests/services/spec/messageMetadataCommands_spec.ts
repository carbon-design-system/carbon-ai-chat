/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { itemFlagsFor, makeConfigStore } from '../../test_helpers';
import { MessageCoordinator } from '../../../src/sdk/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import { addMessages } from '../../../src/sdk/services/haa/humanAgentUtils';
import {
  mergeMessageHistoryFromView,
  setMessageOptionSelectedFromView,
} from '../../../src/sdk/utils/messageMetadataCommands';
import { captureMessageEvent } from '../../../src/sdk/utils/messageEventOwnership';
import { handleCustomFooterSlot } from '../../../src/sdk/services/messaging/coordinateMessageEvents';
import {
  isHumanAgentMessageOwner,
  isHumanAgentLocalOwner,
  markHumanAgentIngress,
} from '../../../src/sdk/store/messageOwnership';
import type { BusEventCustomFooterSlot } from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/sdk/utils/resolvablePromise';
import actions from '../../../src/sdk/store/actions';
import {
  MessageResponseTypes,
  HumanAgentMessageType,
  type MessageResponse,
  type MessageRequest,
} from '../../../src/types/messaging/Messages';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import { withMessagingView } from '../helpers/viewBindings';

it.each(['assistant', 'human agent'] as const)(
  'routes %s metadata by actual ingress and preserves arguments and synchronous writes',
  async (origin) => {
    const store = makeConfigStore({});
    const manager = {
      store,
      restartCount: 0,
      actions: {
        handleUserDefinedResponseItems: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as ServiceManager;
    manager.messageCoordinator = new MessageCoordinator(
      withMessagingView(manager, {
        hasCustomPromptLine: () => false,
        announceSending: () => undefined,
        requestComposerFocus: () => undefined,
        closeHomeScreenIfOpen: () => undefined,
        closeResponsePanelIfOpen: () => undefined,
        closeHomeScreen: () => undefined,
      })
    );
    const item = {
      response_type: MessageResponseTypes.TEXT as const,
      text: 'answer',
      agent_message_type: HumanAgentMessageType.FROM_HUMAN_AGENT,
    };
    const message: MessageResponse = {
      id: 'message',
      history: {},
      output: { generic: [item] },
    };
    const local: LocalMessageItem = {
      item,
      fullMessageID: message.id,
      ui_state: { id: 'local' },
    };
    if (origin === 'human agent') {
      // The mutable HAA event may remove the caller-visible speaker marker.
      delete item.agent_message_type;
      await addMessages(
        [{ originalMessage: message, localMessages: [local] }],
        true,
        manager
      );
    } else {
      store.dispatch(actions.addLocalMessageItem(local, message, true));
    }
    const merge = jest.spyOn(manager.messageCoordinator, 'mergeMessageHistory');
    const select = jest.spyOn(
      manager.messageCoordinator,
      'setMessageOptionSelected'
    );
    const dispatch = jest.spyOn(store, 'dispatch');
    const history = { feedback: { vote: { is_positive: true } } };
    const request: MessageRequest = {
      input: { text: 'selected', structured_data: { fields: [] } },
    };
    expect(
      mergeMessageHistoryFromView(manager, message.id, history)
    ).toBeUndefined();
    expect(
      setMessageOptionSelectedFromView(manager, local.ui_state.id, request)
    ).toBeUndefined();
    expect(dispatch.mock.calls[0][0].history).toBe(history);
    expect(dispatch.mock.calls[1][0].sentMessage).toBe(request);
    expect(itemFlagsFor(store.getState(), 'local')?.optionSelected).toBe(
      request
    );
    expect(merge).toHaveBeenCalledTimes(origin === 'assistant' ? 1 : 0);
    expect(select).toHaveBeenCalledTimes(origin === 'assistant' ? 1 : 0);
    const failure = new Error('dispatch failed');
    dispatch.mockImplementation(() => {
      throw failure;
    });
    expect(() =>
      setMessageOptionSelectedFromView(manager, 'local', request)
    ).toThrow(failure);
  }
);

it.each([false, true])(
  'keeps the current owner when a mutable footer callback changes message ID, core takeover=%s',
  async (takeover) => {
    const store = makeConfigStore({});
    const pending = resolvablePromise<void>();
    const manager = {
      store,
      restartCount: 0,
      fire: async (event: BusEventCustomFooterSlot) => {
        event.data.message.id = 'copied';
        await pending;
      },
    } as unknown as ServiceManager;
    manager.messageCoordinator = new MessageCoordinator(
      withMessagingView(manager, {
        hasCustomPromptLine: () => false,
        announceSending: () => undefined,
        requestComposerFocus: () => undefined,
        closeHomeScreenIfOpen: () => undefined,
        closeResponsePanelIfOpen: () => undefined,
        closeHomeScreen: () => undefined,
      })
    );
    const response: MessageResponse = {
      id: 'source',
      history: {},
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'answer',
            message_item_options: {
              custom_footer_slot: { slot_name: 'footer' },
            },
          },
        ],
      },
    };
    store.dispatch(actions.upsertMessage(response));
    const stored = store.getState().allMessagesByID.source as MessageResponse;
    const local =
      store.getState().allMessageItemsByID[
        store.getState().assistantMessageState.localMessageIDs[0]
      ];
    store.dispatch(
      markHumanAgentIngress(actions.addLocalMessageItem(local, stored, true))
    );
    const work = handleCustomFooterSlot(manager, local, stored);
    if (takeover) {
      store.dispatch(actions.upsertMessage(stored));
      expect(store.getState().allMessagesByID.source).toBe(stored);
    }
    pending.doResolve();
    await work;
    expect(store.getState().allMessagesByID.copied.id).toBe('copied');
    expect(store.getState().allMessagesByID.source).toBe(stored);
    expect(isHumanAgentMessageOwner(store, 'copied')).toBe(!takeover);
    expect(isHumanAgentMessageOwner(store, 'source')).toBe(!takeover);
  }
);

it.each([false, true])(
  'retains clone provenance when a callback changes local full ID, new local ID=%s',
  async (changeLocalID) => {
    const store = makeConfigStore({});
    const manager = { store, restartCount: 0 } as unknown as ServiceManager;
    const message: MessageResponse = {
      id: 'source',
      history: {},
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'answer' }],
      },
    };
    const local: LocalMessageItem = {
      fullMessageID: message.id,
      item: message.output.generic[0],
      ui_state: { id: 'local' },
    };
    store.dispatch(
      markHumanAgentIngress(actions.addLocalMessageItem(local, message, true))
    );
    const event = captureMessageEvent(manager, message, { local });
    const callback = async () => {
      event.localItems.local.fullMessageID = 'destination';
      if (changeLocalID) {
        event.localItems.local.ui_state.id = 'copied-local';
      }
    };
    await callback();
    event.commit();
    const id = changeLocalID ? 'copied-local' : 'local';
    expect(store.getState().allMessageItemsByID[id].fullMessageID).toBe(
      'destination'
    );
    expect(isHumanAgentLocalOwner(store, id)).toBe(true);
    if (changeLocalID) {
      expect(store.getState().allMessageItemsByID.local).toBe(local);
      expect(isHumanAgentLocalOwner(store, 'local')).toBe(true);
    }
    store.dispatch(actions.upsertMessage({ ...message, id: 'destination' }));
    expect(isHumanAgentLocalOwner(store, id)).toBe(false);
    if (changeLocalID) {
      expect(isHumanAgentLocalOwner(store, 'local')).toBe(true);
    }
  }
);

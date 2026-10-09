/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { outputItemToLocalItem } from '../../../src/chat/schema/outputItemToLocalItem';
import {
  addMessages,
  createHumanAgentLocalMessage,
  toPair,
} from '../../../src/chat/services/haa/humanAgentUtils';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { makeConfigStore } from '../../test_helpers';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  HumanAgentMessageType,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { createMessageResponseForItem } from '../../../src/chat/utils/messageUtils';

describe('humanAgentUtils event ownership', () => {
  it('separates the received status event from the message returned for storage', async () => {
    let receiveEventMessage: any;
    const manager = {
      intl: { formatMessage: () => 'Agent joined' },
      fire: jest.fn(async (event) => {
        if (event.type === BusEventType.HUMAN_AGENT_PRE_RECEIVE) {
          event.data.output.generic[0].title = 'Customized';
        }
        if (event.type === BusEventType.HUMAN_AGENT_RECEIVE) {
          receiveEventMessage = event.data;
        }
      }),
    } as unknown as ServiceManager;

    const result = await createHumanAgentLocalMessage(
      HumanAgentMessageType.HUMAN_AGENT_JOINED,
      manager
    );

    expect(result.originalMessage.output.generic[0]).toBe(
      result.localMessage.item
    );
    expect(receiveEventMessage).not.toBe(result.originalMessage);
    expect(receiveEventMessage.output.generic[0].title).toBe('Customized');
    expect(Object.isFrozen(receiveEventMessage)).toBe(true);
    expect(Object.isFrozen(receiveEventMessage.output.generic[0])).toBe(true);
    expect(() => {
      receiveEventMessage.output.generic[0].title = 'Mutated';
    }).toThrow();
    expect((result.localMessage.item as any).title).toBe('Customized');
  });

  it('separates user-defined callbacks, the store, and caller-owned values', async () => {
    const store = makeConfigStore({ messaging: {} });
    const item = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { value: 'original' },
    };
    const originalMessage = createMessageResponseForItem(item);
    const localMessage = outputItemToLocalItem(item, originalMessage);
    let callbackLocalMessage: any;
    let callbackOriginalMessage: any;
    const manager = {
      store,
      actions: {
        handleUserDefinedResponseItems: jest.fn(
          async (eventLocalMessage, eventOriginalMessage) => {
            callbackLocalMessage = eventLocalMessage;
            callbackOriginalMessage = eventOriginalMessage;
          }
        ),
      },
    } as unknown as ServiceManager;

    await addMessages([toPair([localMessage], originalMessage)], true, manager);

    const storedLocalMessage =
      store.getState().allMessageItemsByID[localMessage.ui_state.id];
    const storedMessage = store.getState().allMessagesByID[originalMessage.id];
    expect(storedLocalMessage).not.toBe(localMessage);
    expect(storedMessage).not.toBe(originalMessage);
    expect(callbackLocalMessage).not.toBe(storedLocalMessage);
    expect(callbackOriginalMessage).not.toBe(storedMessage);
    expect(Object.isFrozen(callbackLocalMessage)).toBe(true);
    expect(Object.isFrozen(callbackOriginalMessage)).toBe(true);

    item.user_defined.value = 'caller mutation';
    expect(storedLocalMessage.item.user_defined).toEqual({ value: 'original' });
    expect(() => {
      callbackLocalMessage.item.user_defined.value = 'callback mutation';
    }).toThrow();
    expect(storedLocalMessage.item.user_defined).toEqual({ value: 'original' });
  });
});

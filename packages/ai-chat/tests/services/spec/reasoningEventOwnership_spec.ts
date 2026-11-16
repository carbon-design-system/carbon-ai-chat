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
  BusEventUserDefinedResponse,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '../../../src/aiChatEntry';
import { synthesizeReasoningLocalMessageItem } from '../../../src/chat/utils/reasoningContent';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it.each([false, true])(
  'commits synthetic reasoning edits without storing the wrapper (throws: %p)',
  async (throws) => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const caller: MessageResponse = {
      id: 'reasoning-owner',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Answer' }],
      },
      message_options: {
        reasoning: {
          content: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'before' },
            },
          ],
        },
      },
    };
    await act(() =>
      instance.messaging.upsertMessage(
        caller.id,
        MessageState.COMPLETE,
        () => caller
      )
    );
    const before = instance.getState();
    const stored = store.getState().allMessagesByID[caller.id];
    const content =
      'message_options' in stored && stored.message_options?.reasoning?.content;
    if (!Array.isArray(content)) {
      throw new Error('The reasoning fixture did not load');
    }
    const syntheticID = 'synthetic-reasoning-proof';
    const local = synthesizeReasoningLocalMessageItem(
      content[0],
      caller.id,
      syntheticID
    );
    const slot =
      serviceManager.slotEventService.getOrCreateUserDefinedElement(
        syntheticID
      ).slotName;
    const failure = new Error('Reasoning handler failed');
    let captured: BusEventUserDefinedResponse;
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: BusEventUserDefinedResponse) => {
        if (event.data.slot !== slot) {
          return;
        }
        captured = event;
        event.data.message.user_defined.value = 'after';
        event.data.fullMessage.context = { callback: 'after' };
        if (throws) {
          throw failure;
        }
      },
    });
    await act(async () => {
      const notification =
        serviceManager.slotEventService.handleUserDefinedResponseItems(
          local,
          stored
        );
      if (throws) {
        await expect(notification).rejects.toBe(failure);
      } else {
        await notification;
      }
    });
    const after = instance
      .getState()
      .messages.find(({ id }) => id === caller.id);
    expect(after).toMatchObject({
      context: { callback: 'after' },
      message_options: {
        reasoning: { content: [{ user_defined: { value: 'after' } }] },
      },
    });
    expect(before.messages.find(({ id }) => id === caller.id)).toMatchObject({
      message_options: {
        reasoning: { content: [{ user_defined: { value: 'before' } }] },
      },
    });
    expect(caller).toMatchObject({
      message_options: {
        reasoning: { content: [{ user_defined: { value: 'before' } }] },
      },
    });
    expect(store.getState().allMessageItemsByID[syntheticID]).toBeUndefined();
    captured.data.message.user_defined.value = 'late write';
    captured.data.fullMessage.context = { callback: 'late write' };
    expect(store.getState().allMessagesByID[caller.id]).toMatchObject({
      context: { callback: 'after' },
      message_options: {
        reasoning: { content: [{ user_defined: { value: 'after' } }] },
      },
    });
    expect(
      instance.getState().messages.find(({ id }) => id === caller.id)
    ).toEqual(after);
  }
);

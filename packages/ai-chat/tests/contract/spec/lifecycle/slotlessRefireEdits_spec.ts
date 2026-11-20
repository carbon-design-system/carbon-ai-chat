/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  BusEventUserDefinedResponse,
  ChatInstance,
  MessageResponse,
  MessageState,
} from '../../../../src/aiChatEntry';
import {
  contractElement,
  contractSetup,
  deferred,
  pause,
  responseOf,
  userDefinedItem,
} from '../../helpers';

// @covers config.lifecycle.reuseInstance config.lifecycle.releaseGraceMs
// @covers event.userDefinedResponse instance.messaging.upsertMessage state.messages
// @covers instance.messaging.addMessage
describe('user-defined responses received between reusable mounts', () => {
  contractSetup();

  it('keeps edits from both handlers when naming a message with two responses', async () => {
    const namespace = 'contract-slotless-refire-edits';
    const messageID = 'between-mounts';
    const properties = {
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 2000 },
    };
    const first = await contractElement('cds-aichat-container', {
      properties,
    });
    const releaseFirst = deferred();
    const firstStarted = deferred();
    const handled: string[] = [];
    const handlerErrors: string[] = [];
    const contextsBeforeSecond: unknown[] = [];
    const storedContextsBeforeSecond: unknown[] = [];
    const slots: string[] = [];
    let second: Awaited<ReturnType<typeof contractElement>>;
    try {
      await act(async () => first.remove());
      await pause();
      const response: MessageResponse = {
        ...responseOf(messageID, [
          userDefinedItem('first-item', { name: 'first' }),
          userDefinedItem('second-item', { name: 'second' }),
        ]),
        context: {},
      };
      await act(() =>
        first.instance.messaging.upsertMessage(
          messageID,
          MessageState.COMPLETE,
          () => response
        )
      );
      expect(
        first.instance.getState().messages.find(({ id }) => id === messageID)
          ?.context
      ).toEqual({});

      const handler = async (
        event: BusEventUserDefinedResponse,
        instance: ChatInstance
      ) => {
        if (event.data.fullMessage.id !== messageID) {
          return;
        }
        const name = String(event.data.message.user_defined?.name);
        slots.push(event.data.slot);
        if (name === 'first') {
          firstStarted.resolve();
          await releaseFirst.promise;
        } else {
          contextsBeforeSecond.push(event.data.fullMessage.context);
          storedContextsBeforeSecond.push(
            instance.getState().messages.find(({ id }) => id === messageID)
              ?.context
          );
        }
        try {
          event.data.fullMessage.context = {
            ...(event.data.fullMessage.context as Record<string, unknown>),
            [name]: true,
          };
        } catch (error) {
          handlerErrors.push(String(error));
          throw error;
        }
        handled.push(name);
      };
      const mounting = contractElement('cds-aichat-container', {
        properties: {
          ...properties,
          onBeforeRender: (instance: ChatInstance) => {
            instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler });
          },
        },
      });
      await firstStarted.promise;
      expect(handled).toEqual([]);
      await act(async () => releaseFirst.resolve());
      second = await mounting;
      expect(handlerErrors).toEqual([]);
      await waitFor(() => expect(handled).toEqual(['first', 'second']));
      await pause();

      expect(slots).toHaveLength(2);
      expect(
        slots.every((slot) => typeof slot === 'string' && slot.length > 0)
      ).toBe(true);
      expect(storedContextsBeforeSecond).toEqual([{ first: true }]);
      expect({
        deliveredToSecond: contextsBeforeSecond,
        finalContext: second.instance
          .getState()
          .messages.find(({ id }) => id === messageID)?.context,
      }).toEqual({
        deliveredToSecond: [{ first: true }],
        finalContext: { first: true, second: true },
      });
    } finally {
      releaseFirst.resolve();
      first.remove();
      second?.remove();
    }
  });

  it('delivers committed response edits to the reasoning refire', async () => {
    const messageID = 'between-mounts-reasoning';
    const properties = {
      namespace: 'contract-slotless-refire-reasoning',
      openChatByDefault: false,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 2000 },
    };
    const first = await contractElement('cds-aichat-container', { properties });
    const handled: string[] = [];
    const reasoningContexts: unknown[] = [];
    const storedBeforeReasoning: unknown[] = [];
    const slots: string[] = [];
    let second: Awaited<ReturnType<typeof contractElement>>;
    try {
      await act(async () => first.remove());
      await pause();
      const response: MessageResponse = {
        ...responseOf(messageID, [
          userDefinedItem('first-item', { name: 'first' }),
          userDefinedItem('second-item', { name: 'second' }),
        ]),
        context: {},
        message_options: {
          reasoning: {
            content: [userDefinedItem('reasoning-item', { name: 'reasoning' })],
          },
        },
      };
      await act(() =>
        first.instance.messaging.upsertMessage(
          messageID,
          MessageState.COMPLETE,
          () => response
        )
      );
      second = await contractElement('cds-aichat-container', {
        properties: {
          ...properties,
          onBeforeRender: (instance: ChatInstance) => {
            instance.on({
              type: BusEventType.USER_DEFINED_RESPONSE,
              handler: async (event: BusEventUserDefinedResponse) => {
                if (event.data.fullMessage.id !== messageID) {
                  return;
                }
                const name = String(event.data.message.user_defined?.name);
                slots.push(event.data.slot);
                if (name === 'reasoning') {
                  reasoningContexts.push(event.data.fullMessage.context);
                  storedBeforeReasoning.push(
                    instance
                      .getState()
                      .messages.find(({ id }) => id === messageID)?.context
                  );
                } else {
                  event.data.fullMessage.context = {
                    ...(event.data.fullMessage.context as Record<
                      string,
                      unknown
                    >),
                    [name]: true,
                  };
                }
                handled.push(name);
              },
            });
          },
        },
      });
      await waitFor(() =>
        expect(handled).toEqual(['first', 'second', 'reasoning'])
      );
      await pause();
      expect(
        slots.every((slot) => typeof slot === 'string' && slot.length > 0)
      ).toBe(true);
      expect(storedBeforeReasoning).toEqual([{ first: true, second: true }]);
      expect(reasoningContexts).toEqual([{ first: true, second: true }]);
      expect(
        second.instance.getState().messages.find(({ id }) => id === messageID)
          ?.context
      ).toEqual({ first: true, second: true });
    } finally {
      first.remove();
      second?.remove();
    }
  });

  it('keeps full-response refires readonly after a remount', async () => {
    const messageID = 'between-mounts-readonly';
    const properties = {
      namespace: 'contract-slotless-refire-readonly',
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 2000 },
    };
    const first = await contractElement('cds-aichat-container', { properties });
    const frozen: boolean[] = [];
    let second: Awaited<ReturnType<typeof contractElement>>;
    try {
      await act(async () => first.remove());
      await pause();
      await act(() =>
        first.instance.messaging.addMessage({
          ...responseOf(messageID, [
            userDefinedItem('readonly', { name: 'readonly' }),
          ]),
          context: {},
          message_options: {
            reasoning: {
              content: [
                userDefinedItem('readonly-reasoning', { name: 'reasoning' }),
              ],
            },
          },
        })
      );
      second = await contractElement('cds-aichat-container', {
        properties: {
          ...properties,
          onBeforeRender: (instance: ChatInstance) => {
            instance.on({
              type: BusEventType.USER_DEFINED_RESPONSE,
              handler: (event: BusEventUserDefinedResponse) => {
                if (
                  event.data.fullMessage.id === messageID &&
                  event.data.slot
                ) {
                  frozen.push(Object.isFrozen(event.data.fullMessage));
                }
              },
            });
          },
        },
      });
      await waitFor(() => expect(frozen).toEqual([true, true]));
      expect(
        second.instance.getState().messages.find(({ id }) => id === messageID)
          ?.context
      ).toEqual({});
    } finally {
      first.remove();
      second?.remove();
    }
  });
});

/**
 * @jest-environment node
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["jest-environment"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEvent,
  type BusEventPreReceive,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { MessageResponseTypes } from '../../types/messaging/Messages';
import {
  storedResponse,
  textResponse,
  texts,
  userDefinedResponse,
  withSDK,
} from './helpers/publicContract';

describe('SDK native upsert behavior', () => {
  it('stores a new complete response under its supplied ID', async () => {
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage(
        'new-message',
        MessageState.COMPLETE,
        () => textResponse('new-message', 'hello')
      );
      expect(sdk.state.get().messages.map((message) => message.id)).toEqual([
        'new-message',
      ]);
      expect(texts(storedResponse(sdk.state.get(), 'new-message'))).toEqual([
        'hello',
      ]);
    });
  });

  it('replaces a streaming response with its complete text under the same ID', async () => {
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage('updated', MessageState.STREAMING, () =>
        textResponse('updated', 'v1')
      );
      await sdk.messaging.upsertMessage('updated', MessageState.COMPLETE, () =>
        textResponse('updated', 'v2')
      );
      expect(sdk.state.get().messages.map((message) => message.id)).toEqual([
        'updated',
      ]);
      expect(texts(storedResponse(sdk.state.get(), 'updated'))).toEqual(['v2']);
    });
  });

  it('assigns the call ID to a complete response whose updater omits its ID', async () => {
    await withSDK(async (sdk) => {
      const previousValues: unknown[] = [];
      await sdk.messaging.upsertMessage(
        'assigned',
        MessageState.COMPLETE,
        (previous) => {
          previousValues.push(previous);
          return textResponse(undefined, 'hello');
        }
      );

      expect(previousValues).toEqual([undefined]);
      expect(sdk.state.get().messages.map((message) => message.id)).toEqual([
        'assigned',
      ]);
      expect(texts(storedResponse(sdk.state.get(), 'assigned'))).toEqual([
        'hello',
      ]);
      expect(
        sdk.state
          .get()
          .messageItems?.map(({ id, messageID, status }) => [
            id,
            messageID,
            status,
          ])
      ).toEqual([['assigned:i:0', 'assigned', 'complete']]);
    });
  });

  it('keeps two streaming writes quiet and receives the latest text once on completion', async () => {
    await withSDK(async (sdk) => {
      const events: (BusEventPreReceive | BusEventReceive)[] = [];
      sdk.on(
        ([BusEventType.PRE_RECEIVE, BusEventType.RECEIVE] as const).map(
          (type) => ({
            type,
            handler: (event: BusEvent) => {
              events.push(event as BusEventPreReceive | BusEventReceive);
            },
          })
        )
      );
      const previousTexts: (string[] | undefined)[] = [];
      const write = (state: MessageState, text: string) =>
        sdk.messaging.upsertMessage('stream', state, (previous) => {
          previousTexts.push(previous ? texts(previous) : undefined);
          return textResponse('stream', text);
        });

      await write(MessageState.STREAMING, 'a');
      expect(events).toEqual([]);
      await write(MessageState.STREAMING, 'ab');
      expect(events).toEqual([]);
      await write(MessageState.COMPLETE, 'abc');

      expect(previousTexts).toEqual([undefined, ['a'], ['ab']]);
      expect(events.map(({ type, data }) => [type, data.id])).toEqual([
        [BusEventType.PRE_RECEIVE, 'stream'],
        [BusEventType.RECEIVE, 'stream'],
      ]);
      expect(sdk.state.get().messages.map((message) => message.id)).toEqual([
        'stream',
      ]);
      expect(texts(storedResponse(sdk.state.get(), 'stream'))).toEqual(['abc']);
      expect(
        sdk.state.get().messageItems?.map(({ id, status }) => [id, status])
      ).toEqual([['stream:i:0', 'complete']]);
    });
  });

  it.each([
    {
      label: 'shown STREAMING to COMPLETE',
      from: MessageState.STREAMING,
      to: MessageState.COMPLETE,
      silent: false,
      repeat: true,
    },
    {
      label: 'silent STREAMING to COMPLETE',
      from: MessageState.STREAMING,
      to: MessageState.COMPLETE,
      silent: true,
      repeat: false,
    },
    {
      label: 'shown ERROR to COMPLETE',
      from: MessageState.ERROR,
      to: MessageState.COMPLETE,
      silent: false,
      repeat: false,
    },
    {
      label: 'silent STREAMING to ERROR',
      from: MessageState.STREAMING,
      to: MessageState.ERROR,
      silent: true,
      repeat: true,
    },
  ])(
    'reports user-defined state for $label without changing its payload',
    async ({ from, to, silent, repeat }) => {
      await withSDK(async (sdk) => {
        const states: MessageState[] = [];
        sdk.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: (event) => {
            const { data } = event as BusEventUserDefinedResponse;
            expect(event.type).toBe(BusEventType.USER_DEFINED_RESPONSE);
            expect(data.message.response_type).toBe(
              MessageResponseTypes.USER_DEFINED
            );
            expect(data.fullMessage.id).toBe('terminal');
            states.push(data.state);
          },
        });
        const payload = silent ? { silent: true } : { kind: 'widget' };
        const message = () => {
          const result = userDefinedResponse('terminal');
          result.output.generic[0].user_defined = { ...payload };
          if (!silent) {
            result.output.generic[0].message_item_options = {
              custom_footer_slot: { slot_name: 'complete-footer' },
            };
          }
          return result;
        };

        await sdk.messaging.upsertMessage('terminal', from, message);
        expect(states).toEqual([from]);
        if (from === MessageState.STREAMING) {
          await sdk.messaging.upsertMessage('terminal', from, message);
          expect(states).toEqual([from]);
        }
        await sdk.messaging.upsertMessage('terminal', to, message);
        if (repeat) {
          await sdk.messaging.upsertMessage('terminal', to, message);
        }

        expect(states).toEqual([from, to]);
        expect(
          storedResponse(sdk.state.get(), 'terminal').output.generic[0]
            .user_defined
        ).toEqual(payload);
        expect(
          sdk.state
            .get()
            .messageItems?.map(({ id, messageID, status }) => [
              id,
              messageID,
              status,
            ])
        ).toEqual(silent ? [] : [['terminal:i:0', 'terminal', to]]);
      });
    }
  );

  it.each(['undefined', 'mismatched ID'] as const)(
    'rejects an updater returning %s before publishing a message or receive event',
    async (kind) => {
      await withSDK(async (sdk) => {
        const events: string[] = [];
        sdk.on(
          ([BusEventType.PRE_RECEIVE, BusEventType.RECEIVE] as const).map(
            (type) => ({
              type,
              handler: (event: BusEvent) => {
                events.push(event.type);
              },
            })
          )
        );
        await expect(
          sdk.messaging.upsertMessage('expected', MessageState.COMPLETE, () =>
            kind === 'undefined'
              ? undefined
              : textResponse('different', 'invalid')
          )
        ).rejects.toBeInstanceOf(TypeError);
        expect(sdk.state.get().messages).toEqual([]);
        expect(sdk.state.get().messageItems).toEqual([]);
        expect(events).toEqual([]);
      });
    }
  );

  it('keeps the messages selection unchanged when failTurn only changes status and error', async () => {
    await withSDK(
      async (sdk) => {
        await sdk.messaging.send('turn');
        const reply = storedResponse(sdk.state.get(), 'completed-reply');
        expect(reply).toMatchObject({
          id: 'completed-reply',
          request_id: sdk.state.get().messages[0].id,
        });
        expect(texts(reply)).toEqual(['completed reply']);
        expect(sdk.state.get().status).toBe('ready');
        const before = sdk.state.get().messages;
        const selected: unknown[] = [];
        const unsubscribe = sdk.state.select(
          (state) => state.messages,
          (messages) => {
            selected.push(messages);
          }
        );
        try {
          await sdk.messaging.failTurn({
            messageID: before[0].id,
            error: { message: 'failed' },
          });
          expect(sdk.state.get().status).toBe('error');
          expect(sdk.state.get().error).toMatchObject({
            message: 'failed',
            messageID: before[0].id,
          });
          expect(sdk.state.get().messages).toBe(before);
          expect(selected).toEqual([]);
        } finally {
          unsubscribe();
        }
      },
      async (request, _options, instance) => {
        const reply = {
          ...textResponse('completed-reply', 'completed reply'),
          request_id: request.id,
        };
        await instance.messaging.upsertMessage(
          reply.id,
          MessageState.COMPLETE,
          () => reply
        );
      }
    );
  });
});

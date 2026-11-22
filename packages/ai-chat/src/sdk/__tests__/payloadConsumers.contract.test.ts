/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKHandlers } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventUserDefinedResponse,
  type BusEventPreSend,
} from '../../types/events/eventBusTypes';
import {
  MessageInputType,
  MessageResponseTypes,
  type EventInput,
  type MessageInput,
  type MessageRequest,
  type MessageResponse,
} from '../../types/messaging/Messages';
import { texts, withSDK } from './helpers/publicContract';

describe('SDK supported payload consumers', () => {
  it('delivers a host widget class without constructing it before its consumer does', async () => {
    await withSDK(async (sdk) => {
      let constructions = 0;
      class Widget {
        constructor(private label: string) {
          constructions += 1;
        }
        render() {
          return this.label;
        }
      }
      function expectWidget(value: unknown): asserts value is typeof Widget {
        expect(value).toBe(Widget);
      }
      const rendered: string[] = [];
      const handler: ChatSDKHandlers = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: BusEventUserDefinedResponse) => {
          expect(constructions).toBe(0);
          const Delivered = event.data.message.user_defined.Widget;
          expectWidget(Delivered);
          const widget = new Delivered('Public widget output');
          rendered.push(widget.render());
        },
      };
      sdk.on(handler);
      try {
        await sdk.messaging.upsertMessage(
          'widget-class',
          MessageState.COMPLETE,
          () => ({
            id: 'widget-class',
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.USER_DEFINED,
                  user_defined: { Widget },
                },
              ],
            },
          })
        );
        expect(constructions).toBe(1);
        expect(rendered).toEqual(['Public widget output']);
      } finally {
        sdk.off(handler);
      }
    });
  });

  it('keeps a host response getter while streaming and accepts its frozen public snapshot as the completed write', async () => {
    class HostReply implements MessageResponse {
      get id() {
        return 'host-class-reply';
      }
      output: MessageResponse['output'] = {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Host class reply',
            streaming_metadata: { id: 'text' },
          },
        ],
      };
    }
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage(
        'host-class-reply',
        MessageState.STREAMING,
        () => new HostReply()
      );
      const retained = sdk.state.get();
      const frozen = retained.messages.find(
        ({ id }) => id === 'host-class-reply'
      );
      if (!frozen || !('output' in frozen)) {
        throw new Error('Expected the public host response');
      }
      expect(frozen).toBeInstanceOf(HostReply);
      expect(frozen.id).toBe('host-class-reply');
      expect(texts(frozen)).toEqual(['Host class reply']);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(retained.messageItems[0].status).toBe('streaming');

      await sdk.messaging.upsertMessage(
        'host-class-reply',
        MessageState.COMPLETE,
        () => frozen
      );
      const current = sdk.state.get();
      const completed = current.messages.find(
        ({ id }) => id === 'host-class-reply'
      );
      if (!completed || !('output' in completed)) {
        throw new Error('Expected the completed public host response');
      }
      expect(completed).toBeInstanceOf(HostReply);
      expect(completed.id).toBe('host-class-reply');
      expect(texts(completed)).toEqual(['Host class reply']);
      expect(current.messageItems[0].status).toBe('complete');
      expect(retained.messageItems[0].status).toBe('streaming');
    });
  });

  it('copies frozen binary input for event transport and lets a text pre-send normalize its own copy', async () => {
    const transported: MessageRequest[] = [];
    await withSDK(
      async (sdk) => {
        const normalized: number[][] = [];
        const handler: ChatSDKHandlers = {
          type: BusEventType.PRE_SEND,
          handler: (event: BusEventPreSend) => {
            const data = event.data.input.structured_data;
            const bytes = data.user_defined.bytes;
            if (!(bytes instanceof Uint8Array)) {
              throw new Error('Expected owned binary input');
            }
            const values = Array.from(bytes);
            normalized.push(values);
            data.user_defined = { values };
          },
        };
        sdk.on(handler);
        try {
          const eventBytes = new Uint8Array([1, 2]);
          const eventData = Object.freeze({
            user_defined: { bytes: eventBytes },
          });
          const eventRequest: MessageRequest<EventInput & MessageInput> = {
            input: {
              message_type: MessageInputType.EVENT,
              event: { name: 'owned-control' },
              structured_data: eventData,
            },
          };
          await sdk.messaging.send(eventRequest);
          expect(transported[0].input).toMatchObject({
            message_type: MessageInputType.EVENT,
            event: { name: 'owned-control' },
          });
          const copied =
            transported[0].input.structured_data.user_defined.bytes;
          expect(copied).toBeInstanceOf(Uint8Array);
          expect(Array.from(copied)).toEqual([1, 2]);
          expect(copied).not.toBe(eventBytes);
          copied[0] = 9;
          expect(Array.from(eventBytes)).toEqual([1, 2]);

          const textBytes = new Uint8Array([3, 4]);
          const textData = Object.freeze({
            user_defined: { bytes: textBytes },
          });
          await sdk.messaging.send({
            input: {
              text: 'Normalize owned binary',
              structured_data: textData,
            },
          });
          // The later text send positively controls the event's skipped pre-send.
          expect(normalized).toEqual([[3, 4]]);
          expect(transported).toHaveLength(2);
          expect(transported[1].input.structured_data).toEqual({
            user_defined: { values: [3, 4] },
          });
          expect(textData.user_defined.bytes).toBe(textBytes);
          expect(Array.from(textBytes)).toEqual([3, 4]);
        } finally {
          sdk.off(handler);
        }
      },
      (request): void => {
        transported.push(request);
      }
    );
  });
});

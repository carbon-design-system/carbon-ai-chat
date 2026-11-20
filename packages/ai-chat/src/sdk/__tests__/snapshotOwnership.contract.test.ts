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

import type { ChatSDKState } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageResponse,
  type TextItem,
} from '../../types/messaging/Messages';
import {
  storedResponse,
  userDefinedResponse,
  withSDK,
} from './helpers/publicContract';

describe('SDK unread message snapshots', () => {
  it('retains an unread snapshot when a streaming user-defined handler edits and throws', async () => {
    await withSDK(async (sdk) => {
      let retained: ChatSDKState;
      let calls = 0;
      const failure = new Error('slot handler failed');
      sdk.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event) => {
          calls += 1;
          retained = sdk.state.get();
          (
            event as BusEventUserDefinedResponse
          ).data.message.user_defined.value = 'after';
          throw failure;
        },
      });

      await expect(
        sdk.messaging.upsertMessage(
          'throwing-slot',
          MessageState.STREAMING,
          () => userDefinedResponse('throwing-slot')
        )
      ).rejects.toThrow(failure);

      expect(calls).toBe(1);
      // First read of retained.messages deliberately occurs after the edit.
      const before = storedResponse(retained, 'throwing-slot');
      const after = storedResponse(sdk.state.get(), 'throwing-slot');
      expect(before.output.generic[0].user_defined.value).toBe('before');
      expect(after.output.generic[0].user_defined.value).toBe('after');
      expect(Object.isFrozen(before.output.generic[0].user_defined)).toBe(true);
    });
  });

  it.each([
    {
      label: 'USER_DEFINED_RESPONSE',
      type: BusEventType.USER_DEFINED_RESPONSE,
    },
    { label: 'RECEIVE', type: BusEventType.RECEIVE },
  ] as const)(
    'retains an unread snapshot before successful $label edits',
    async ({ type }) => {
      await withSDK(async (sdk) => {
        let retained: ChatSDKState;
        let calls = 0;
        sdk.on({
          type,
          handler: (event) => {
            calls += 1;
            retained = sdk.state.get();
            const item =
              type === BusEventType.RECEIVE
                ? (event as BusEventReceive).data.output.generic[0]
                : (event as BusEventUserDefinedResponse).data.message;
            item.user_defined.value = 'after';
          },
        });

        await sdk.messaging.upsertMessage('owned', MessageState.COMPLETE, () =>
          userDefinedResponse('owned')
        );

        expect(calls).toBe(1);
        // Neither messages nor messageItems was read on retained before the edit.
        const before = storedResponse(retained, 'owned');
        const after = storedResponse(sdk.state.get(), 'owned');
        expect(before.output.generic[0].user_defined.value).toBe('before');
        expect(after.output.generic[0].user_defined.value).toBe('after');
        expect(Object.isFrozen(before.output.generic[0].user_defined)).toBe(
          true
        );
      });
    }
  );

  it.each(['unread', 'fresh'] as const)(
    'isolates the %s callback snapshot from transport request edits',
    async (snapshotKind) => {
      let retained: ChatSDKState;
      let requestID: string;
      let calls = 0;
      await withSDK(
        async (sdk) => {
          await sdk.messaging.send('Original request');
          expect(calls).toBe(1);
          expect(
            retained.messages.find((message) => message.id === requestID)
          ).toMatchObject({ input: { text: 'Original request' } });
          expect(
            sdk.state.get().messages.find((message) => message.id === requestID)
          ).toMatchObject({ input: { text: 'Original request' } });
        },
        (request, _options, instance) => {
          calls += 1;
          requestID = request.id;
          const unread = instance.state.get();
          request.input.text = 'Changed by the host';
          retained = snapshotKind === 'unread' ? unread : instance.state.get();
        }
      );
    }
  );

  it('commits both user-defined item and full-message edits through the public event', async () => {
    await withSDK(async (sdk) => {
      const response = userDefinedResponse('writable-slot');
      response.output.generic.push({
        response_type: MessageResponseTypes.TEXT,
        text: 'before',
      });
      let calls = 0;
      sdk.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event) => {
          calls += 1;
          const { data } = event as BusEventUserDefinedResponse;
          expect(Object.isFrozen(data)).toBe(false);
          data.message.user_defined.value = 'item edit';
          (
            (data.fullMessage as MessageResponse).output.generic[1] as TextItem
          ).text = 'full-message edit';
        },
      });

      await sdk.messaging.upsertMessage(
        response.id,
        MessageState.STREAMING,
        () => response
      );

      expect(calls).toBe(1);
      const stored = storedResponse(sdk.state.get(), response.id);
      expect(stored.output.generic[0].user_defined).toEqual({
        value: 'item edit',
      });
      expect(stored.output.generic[1]).toMatchObject({
        text: 'full-message edit',
      });
      expect(response.output).toEqual(stored.output);
    });
  });
});

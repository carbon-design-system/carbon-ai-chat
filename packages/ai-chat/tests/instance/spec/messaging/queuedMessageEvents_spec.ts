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
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  BusEvent,
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../../../src/types/events/eventBusTypes';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';

const cases = [
  BusEventType.PRE_RECEIVE,
  BusEventType.RECEIVE,
  BusEventType.USER_DEFINED_RESPONSE,
].flatMap((type) =>
  ['addMessage', 'upsertMessage'].flatMap((method) =>
    ['remove', 'restart'].map((invalidate) => ({ type, method, invalidate }))
  )
);

describe('queued message event lifetime', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each(cases)(
    'skips queued $type from $method after $invalidate and replacement',
    async ({ type, method, invalidate }) => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const entered = resolvablePromise<void>();
      const queued = resolvablePromise<void>();
      const release = resolvablePromise<void>();
      const messageID = (event: BusEvent) =>
        event.type === BusEventType.USER_DEFINED_RESPONSE
          ? (event as BusEventUserDefinedResponse).data.fullMessage.id
          : (event as BusEventPreReceive | BusEventReceive).data.id;
      const observed: string[] = [];
      instance.on({
        type,
        handler: async (event: BusEvent) => {
          const id = messageID(event);
          observed.push(id);
          if (id === 'held') {
            entered.doResolve();
            await release;
          }
        },
      });
      const originalFire = serviceManager.eventBus.fire.bind(
        serviceManager.eventBus
      );
      jest
        .spyOn(serviceManager.eventBus, 'fire')
        .mockImplementation((event, chat, isCurrent) => {
          const result = originalFire(event, chat, isCurrent);
          if (event.type === type && messageID(event) === 'reused') {
            queued.doResolve();
          }
          return result;
        });
      const write = (id: string) => {
        const response: MessageResponse = {
          id,
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: { value: id },
              },
            ],
          },
        };
        return method === 'addMessage'
          ? instance.messaging.addMessage(response)
          : instance.messaging.upsertMessage(
              id,
              MessageState.COMPLETE,
              () => response
            );
      };
      let first: Promise<void>;
      let second: Promise<void>;
      try {
        await act(async () => {
          first = write('held');
          await entered;
          second = write('reused');
          await queued;
        });
        expect(observed).toEqual(['held']);
        await act(async () => {
          if (invalidate === 'remove') {
            await instance.messaging.removeMessages(['reused']);
          } else {
            await instance.restartConversation();
          }
          await instance.messaging.upsertMessage(
            'reused',
            MessageState.STREAMING,
            () => ({
              id: 'reused',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.TEXT,
                    text: 'Replacement',
                  },
                ],
              },
            })
          );
          release.doResolve();
          await Promise.all([first, second]);
          await serviceManager.eventBus.waitForEmpty();
        });
        expect(observed).toEqual(['held']);
        expect(store.getState().allMessagesByID.reused).toMatchObject({
          output: { generic: [{ text: 'Replacement' }] },
        });
      } finally {
        release.doResolve();
        await Promise.all([first, second]);
      }
    }
  );
});

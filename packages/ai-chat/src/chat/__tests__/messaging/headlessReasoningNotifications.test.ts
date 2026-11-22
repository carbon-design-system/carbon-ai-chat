/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import { BusEventType } from '../../../types/events/eventBusTypes';
import {
  createBaseConfig,
  bootChat,
  setupAfterEach,
  setupBeforeEach,
  shutdownBootedChats,
} from '../helpers/chat';

const response = (id: string, value: string): MessageResponse => ({
  id,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Answer',
        streaming_metadata: { id: 'answer' },
      },
    ],
  },
  message_options: {
    reasoning: {
      content: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value },
        },
      ],
    },
  },
});

beforeEach(setupBeforeEach);
afterEach(async () => {
  await shutdownBootedChats();
  setupAfterEach();
});

// D7 of the #2349 plan: headless delivery runs whenever no view is attached,
// so a chat whose view detached keeps delivering reasoning items.
it('delivers headlessly once the view detaches', async () => {
  const { instance, view } = await bootChat(createBaseConfig(), {
    attach: true,
  });
  view.detach();
  const values: unknown[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
    },
  });
  await instance.messaging.addMessage(response('hidden-view', 'reasoning'));
  await waitFor(() => expect(values).toEqual(['reasoning']));
});

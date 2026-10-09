/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A local assistant transport for the custom prompt line.
 * Start at customSendMessage: addMessage echoes the supplied text.
 */
import { type PublicConfig, MessageResponseTypes } from '@carbon/ai-chat';

export const customSendMessage: NonNullable<
  PublicConfig['messaging']
>['customSendMessage'] = async (request, _options, instance) => {
  if (request.input.text === 'fail') {
    throw new Error('Demo send failed. Edit the message and try again.');
  }
  await instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: request.input.text
            ? `You sent: ${request.input.text}`
            : 'Write a message below. Send "fail" to try the error state.',
        },
      ],
    },
  });
};

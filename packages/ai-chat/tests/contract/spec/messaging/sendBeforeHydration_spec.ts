/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import { MessageRequest } from '../../../../src/aiChatEntry';
import { ContractDriver, describeShared, finishSend } from '../../helpers';

/** The text of each message in the list, in list order. */
const listedTexts = (chat: ContractDriver) =>
  chat.messages().map((message) => (message as MessageRequest).input?.text);

// @covers instance.send config.messaging.customSendMessage state.messages
describeShared(
  'sends made before the first hydration finishes',
  (makeDriver) => {
    it('reach customSendMessage and the message list in call order', async () => {
      const chat = await makeDriver();
      let first: Promise<void>;
      let second: Promise<void>;
      await act(async () => {
        first = chat.send('first');
        second = chat.send('second');
      });
      const sentFirst = await chat.backend.next();
      expect(sentFirst.request.input.text).toBe('first');
      expect(listedTexts(chat)).toEqual(['first', 'second']);
      await finishSend({ sent: sentFirst, done: first });
      const sentSecond = await chat.backend.next();
      expect(sentSecond.request.input.text).toBe('second');
      await finishSend({ sent: sentSecond, done: second });
      expect(chat.backend.texts()).toEqual(['first', 'second']);
      expect(listedTexts(chat)).toEqual(['first', 'second']);
      await waitFor(() => expect(chat.status()).toBe('ready'));
    });
  }
);

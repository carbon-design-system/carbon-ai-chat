/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import { BusEventType, MessageRequest } from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  deferred,
  describeShared,
  finishSend,
} from '../../helpers';

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

// @covers instance.send event.chat:ready config.messaging.customSendMessage
describeShared(
  'a chat:ready handler during a hydration a send started',
  (makeDriver) => {
    it('can await a send, which goes out before the starting send', async () => {
      const chat = await makeDriver();
      let fromReady: Promise<void>;
      chat.on({
        type: BusEventType.CHAT_READY,
        handler: async () => {
          fromReady = chat.send('from ready');
          await fromReady;
        },
      });
      let first: Promise<void>;
      await act(async () => {
        first = chat.send('first');
      });
      const sentFromReady = await chat.backend.next();
      expect(sentFromReady.request.input.text).toBe('from ready');
      await finishSend({ sent: sentFromReady, done: fromReady });
      const sentFirst = await chat.backend.next();
      expect(sentFirst.request.input.text).toBe('first');
      await finishSend({ sent: sentFirst, done: first });
      expect(chat.backend.texts()).toEqual(['from ready', 'first']);
    });

    it('that never settles still lets a send made after it fires go out', async () => {
      const chat = await makeDriver();
      const ready = deferred();
      chat.on({
        type: BusEventType.CHAT_READY,
        handler: () => {
          ready.resolve();
          return new Promise<void>(() => {});
        },
      });
      await act(async () => {
        chat.send('first');
      });
      await ready.promise;
      let later: Promise<void>;
      await act(async () => {
        later = chat.send('later');
      });
      await waitFor(() => expect(chat.backend.texts()).toContain('later'));
      const sentLater = chat.backend.requests.find(
        (sent) => sent.request.input.text === 'later'
      );
      await finishSend({ sent: sentLater, done: later });
    });
  }
);

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
  BusEventPreSend,
  BusEventSend,
  BusEventType,
  MessageErrorState,
  MessageResponseTypes,
  OnErrorData,
  OnErrorType,
  SendOptions,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  DriverFactory,
  SEND_ERROR_MESSAGE,
  describeShared,
  deferred,
  finishSend,
  startSend,
} from '../../helpers';

type HandlerType = BusEventType.PRE_SEND | BusEventType.SEND;

/** What a send's promise settled with. */
type Outcome = { resolved: true } | { resolved: false; error: unknown };

/** A driver whose `onError` records each call. */
async function driverWithOnError(
  makeDriver: DriverFactory
): Promise<{ chat: ContractDriver; errors: OnErrorData[] }> {
  const errors: OnErrorData[] = [];
  const chat = await makeDriver({
    onError: (data) => {
      errors.push(data);
    },
  });
  return { chat, errors };
}

/** Adds a handler of the given type that throws for a request with this text. */
function throwFor(
  chat: ContractDriver,
  type: HandlerType,
  text: string,
  failure: unknown
) {
  chat.on({
    type,
    handler: (event: BusEventPreSend | BusEventSend) => {
      if (event.data.input.text === text) {
        throw failure;
      }
    },
  });
}

/** Sends and waits for the send to settle, recording how it settled. */
async function settle(
  chat: ContractDriver,
  text: string,
  options?: SendOptions
): Promise<Outcome> {
  let outcome: Outcome;
  await act(async () => {
    outcome = await chat.send(text, options).then(
      (): Outcome => ({ resolved: true }),
      (error: unknown): Outcome => ({ resolved: false, error })
    );
  });
  return outcome;
}

const HANDLERS: [string, HandlerType][] = [
  ['pre:send', BusEventType.PRE_SEND],
  ['send', BusEventType.SEND],
];

// @covers instance.send event.pre:send event.send state.status state.messages
// @covers config.messaging.customSendMessage config.onError
// @covers export.aiChatEntry.OnErrorType export.aiChatEntry.MessageErrorState
// @covers response-type.inline_error
describeShared('a throwing send handler', (makeDriver) => {
  it.each(HANDLERS)(
    'rejects send() with the very error a %s handler throws, and calls no customSendMessage',
    async (_name, type) => {
      const chat = await makeDriver();
      const failure = new Error('handler failed');
      throwFor(chat, type, 'hello', failure);
      const outcome = await settle(chat, 'hello');
      expect(outcome).toEqual({ resolved: false, error: failure });
      expect((outcome as { error: unknown }).error).toBe(failure);
      expect(chat.backend.requests).toHaveLength(0);
    }
  );

  it.each(HANDLERS)(
    'marks the request failed, reports MESSAGE_COMMUNICATION, and reads ready after a throwing %s handler',
    async (_name, type) => {
      const { chat, errors } = await driverWithOnError(makeDriver);
      throwFor(chat, type, 'hello', new Error('handler failed'));
      await settle(chat, 'hello');
      expect(chat.status()).toBe('ready');
      const messages = chat.messages();
      expect(messages).toHaveLength(1);
      expect(messages[0].history?.error_state).toBe(MessageErrorState.FAILED);
      expect(errors).toEqual([
        {
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: SEND_ERROR_MESSAGE,
          otherData: 'handler failed',
        },
      ]);
    }
  );

  it.each(HANDLERS)(
    'sends the next queued message after a throwing %s handler',
    async (_name, type) => {
      const chat = await makeDriver();
      // A finished send first, so both sends below queue behind no hydration.
      await finishSend(await startSend(chat, 'warm up'));
      throwFor(chat, type, 'first', new Error('handler failed'));
      let first: Promise<void>;
      let second: Promise<void>;
      await act(async () => {
        first = chat.send('first');
        second = chat.send('second');
      });
      await expect(first).rejects.toThrow('handler failed');
      const sent = await chat.backend.next();
      expect(sent.request.input.text).toBe('second');
      expect(chat.backend.texts()).toEqual(['warm up', 'second']);
      await finishSend({ sent, done: second });
      await waitFor(() => expect(chat.status()).toBe('ready'));
    }
  );

  it.each(HANDLERS)(
    'adds an inline error response after a silent send whose %s handler throws',
    async (_name, type) => {
      const chat = await makeDriver();
      throwFor(chat, type, 'hello', new Error('handler failed'));
      await settle(chat, 'hello', { silent: true });
      const messages = chat.messages();
      expect(messages).toHaveLength(2);
      const reply = messages[1] as {
        output?: { generic?: { response_type: string }[] };
      };
      expect(reply.output.generic.map((item) => item.response_type)).toEqual([
        MessageResponseTypes.INLINE_ERROR,
      ]);
    }
  );
  it.each(HANDLERS)(
    'ignores a %s handler rejection after clearConversation canceled its send',
    async (_name, type) => {
      const { chat, errors } = await driverWithOnError(makeDriver);
      await finishSend(await startSend(chat, 'warm up'));
      const gate = deferred();
      let entered = false;
      chat.on({
        type,
        handler: (event: BusEventPreSend | BusEventSend) => {
          if (event.data.input.text === 'first') {
            entered = true;
            return gate.promise;
          }
          return undefined;
        },
      });
      let outcome: Outcome;
      await act(async () => {
        chat.send('first', { silent: true }).then(
          () => {
            outcome = { resolved: true };
          },
          (error) => {
            outcome = { resolved: false, error };
          }
        );
      });
      await waitFor(() => expect(entered).toBe(true));
      await act(() => chat.messaging.clearConversation());
      await waitFor(() => expect(outcome).toEqual({ resolved: true }));
      expect(chat.messages()).toEqual([]);
      expect(errors).toEqual([]);

      await act(async () => {
        gate.reject(new Error('late handler failure'));
      });
      const next = await startSend(chat, 'after');
      await finishSend(next);
      expect(chat.backend.texts()).toEqual(['warm up', 'after']);
      expect(chat.messages().map((message) => message.id)).toEqual([
        next.sent.request.id,
      ]);
      expect(chat.messages()[0]).toMatchObject({ input: { text: 'after' } });
      expect(chat.status()).toBe('ready');
      expect(errors).toEqual([]);
      expect(outcome).toEqual({ resolved: true });
    }
  );
});

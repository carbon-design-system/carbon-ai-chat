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
  BusEventType,
  BusEventUserDefinedResponse,
  MessageErrorState,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '../../../../src/aiChatEntry';
import {
  advance,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  recordEvents,
  responseOf,
  startSend,
  textItem,
  userDefinedItem,
} from '../../helpers';

// @covers instance.messaging.upsertMessage instance.messaging.failTurn event.userDefinedResponse state.messages
// @covers state.status state.isMessageLoadingCounter
describe('failTurn during an upsert pause', () => {
  contractSetup();

  it('keeps the failure mark in the revealed slot and stored response', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const sent = await startSend(instanceSender(instance, backend), 'Hello');
    await finishSend(sent);
    jest.useFakeTimers();

    const id = 'paused-response';
    const events = recordEvents(instance, [BusEventType.USER_DEFINED_RESPONSE]);
    const message = (): MessageResponse => ({
      ...responseOf(id, [
        textItem('Before the pause'),
        {
          response_type: MessageResponseTypes.PAUSE,
          time: 60_000,
          typing: true,
        },
        userDefinedItem('after-pause', { kind: 'after the pause' }),
      ]),
      request_id: sent.sent.request.id,
    });
    const storedResponse = () =>
      instance
        .getState()
        .messages.find((item) => item.id === id) as MessageResponse;
    let writing: Promise<void>;
    await act(async () => {
      writing = instance.messaging.upsertMessage(
        id,
        MessageState.STREAMING,
        message
      );
    });
    expect(instance.getState().isMessageLoadingCounter).toBe(1);
    expect(instance.state.get().status).toBe('streaming');
    expect(events.events).toHaveLength(0);
    expect(storedResponse().history.error_state).toBeUndefined();

    await act(async () => {
      await instance.messaging.failTurn({
        messageID: id,
        error: { message: 'The stream closed during the pause.' },
      });
    });
    expect(storedResponse().history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    expect(instance.state.get().status).toBe('error');
    expect(events.events).toHaveLength(0);

    await advance(60_000);
    await act(async () => {
      await writing;
    });

    const revealed = events.of<BusEventUserDefinedResponse>(
      BusEventType.USER_DEFINED_RESPONSE
    );
    expect(revealed).toHaveLength(1);
    expect(revealed[0].data.message).toEqual(
      expect.objectContaining({
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { kind: 'after the pause' },
      })
    );
    expect(revealed[0].data.fullMessage.id).toBe(id);
    expect(typeof revealed[0].data.slot).toBe('string');
    expect(revealed[0].data.fullMessage.history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    expect(storedResponse().history.error_state).toBe(
      MessageErrorState.FAILED_WHILE_STREAMING
    );
    expect(instance.state.get().status).toBe('error');
  });
});

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
  BusEventPreReceive,
  BusEventType,
  MessageResponse,
  ViewType,
} from '../../../aiChatEntry';
import {
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  finishSend,
  instanceSender,
  mainPanelText,
  pause,
  recordEvents,
  startSend,
  textResponse,
} from '../helpers/contract';

describe('late replies to one request', () => {
  contractSetup();

  it('keeps the request ID on both delayed replies, and shows both', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const events = recordEvents(instance, [BusEventType.PRE_RECEIVE]);

    const started = await startSend(
      instanceSender(instance, backend),
      'two replies, please'
    );
    const requestID = started.sent.request.id;
    expect(requestID).toBeTruthy();
    // The backend call settles before any reply arrives.
    await finishSend(started);

    await pause(20);
    await act(() =>
      instance.messaging.addMessage(
        textResponse('First late reply', 'late-1', { request_id: requestID })
      )
    );
    await pause(20);
    await act(() =>
      instance.messaging.addMessage(
        textResponse('Second late reply', 'late-2', { request_id: requestID })
      )
    );

    expect(
      events
        .of<BusEventPreReceive>(BusEventType.PRE_RECEIVE)
        .map((event) => event.data.request_id)
    ).toEqual([requestID, requestID]);
    const replies = instance
      .getState()
      .messages.filter((message) => message.id !== requestID);
    expect(
      replies.map((message) => ({
        id: message.id,
        request_id: (message as MessageResponse).request_id,
      }))
    ).toEqual([
      { id: 'late-1', request_id: requestID },
      { id: 'late-2', request_id: requestID },
    ]);
    await waitFor(() => {
      expect(mainPanelText()).toContain('First late reply');
      expect(mainPanelText()).toContain('Second late reply');
    });
  });
});

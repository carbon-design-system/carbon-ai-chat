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
  MessageErrorState,
  MessageRequest,
  OnErrorData,
  OnErrorType,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  SEND_ERROR_MESSAGE,
  changeView,
  contractChat,
  contractSetup,
} from '../../helpers';

/** The fields of an `onError` call a host reads, without `otherData`. */
const summary = ({ errorType, message }: OnErrorData) => ({
  errorType,
  message,
});

const failed = {
  errorType: OnErrorType.MESSAGE_COMMUNICATION,
  message: SEND_ERROR_MESSAGE,
};

// The chat has nothing to send through, so every request fails. `main` gets
// there by calling the missing `customSendMessage`, so these tests don't pin
// the error `send` rejects with or `onError`'s `otherData`.
// @covers config.messaging
describe('messaging: a chat with no messaging config', () => {
  contractSetup();

  it('fails the welcome request when it opens, and reports it through onError', async () => {
    const errors: OnErrorData[] = [];
    const { instance } = await contractChat({
      onError: (data) => errors.push(data),
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    await waitFor(() => expect(errors).toHaveLength(1));
    expect(errors.map(summary)).toEqual([failed]);
    const messages = instance.getState().messages as MessageRequest[];
    expect(messages.map((message) => message.history?.error_state)).toEqual([
      MessageErrorState.FAILED,
    ]);
  });

  it('rejects a send, keeps the request marked failed, and reports it through onError', async () => {
    const errors: OnErrorData[] = [];
    const { instance } = await contractChat({
      onError: (data) => errors.push(data),
    });
    let rejected = false;
    await act(async () => {
      await instance.send('hello').catch(() => {
        rejected = true;
      });
    });
    expect(rejected).toBe(true);
    // The send stands in for the welcome request, so it is the only request.
    const messages = instance.getState().messages as MessageRequest[];
    expect(
      messages.map((message) => [
        message.input.text,
        message.history?.error_state,
      ])
    ).toEqual([['hello', MessageErrorState.FAILED]]);
    expect(errors.map(summary)).toEqual([failed]);
  });
});

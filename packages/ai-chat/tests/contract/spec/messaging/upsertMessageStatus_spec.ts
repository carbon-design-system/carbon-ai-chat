/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import { MessageState } from '../../../../src/aiChatEntry';
import {
  describeShared,
  finishSend,
  startSend,
  upsertText,
} from '../../helpers';

// @covers instance.messaging.upsertMessage state.status
describeShared('upsertMessage and status', (makeDriver) => {
  it('reports streaming while a message is STREAMING, and ready once it is COMPLETE', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    expect(chat.status()).toBe('streaming');
    await upsertText(chat, 'm1', MessageState.STREAMING, 'ab');
    expect(chat.status()).toBe('streaming');
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'abc');
    expect(chat.status()).toBe('ready');
  });

  it('reports ready once a STREAMING message moves to ERROR', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    await upsertText(chat, 'm1', MessageState.ERROR, 'failed');
    expect(chat.status()).toBe('ready');
  });

  it('stays streaming until every STREAMING message ends', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'a', MessageState.STREAMING, 'a');
    await upsertText(chat, 'b', MessageState.STREAMING, 'b');
    await upsertText(chat, 'a', MessageState.COMPLETE, 'a!');
    expect(chat.status()).toBe('streaming');
    await upsertText(chat, 'b', MessageState.ERROR, 'b!');
    expect(chat.status()).toBe('ready');
  });

  it('reports ready when removeMessages drops the STREAMING message', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    await act(() => chat.messaging.removeMessages(['m1']));
    expect(chat.status()).toBe('ready');
  });

  it('stays streaming after a COMPLETE upsert while the send is pending, then ready', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    expect(chat.status()).toBe('submitted');
    await upsertText(chat, 'r1', MessageState.STREAMING, 'a');
    expect(chat.status()).toBe('streaming');
    await upsertText(chat, 'r1', MessageState.COMPLETE, 'ab');
    expect(chat.status()).toBe('streaming');
    await finishSend(started);
    expect(chat.status()).toBe('ready');
    expect(chat.messages().map((message) => message.id)).toEqual([
      started.sent.request.id,
      'r1',
    ]);
  });

  it('keeps ready for a COMPLETE or ERROR upsert of a new ID', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'a', MessageState.COMPLETE, 'a');
    expect(chat.status()).toBe('ready');
    await upsertText(chat, 'b', MessageState.ERROR, 'b');
    expect(chat.status()).toBe('ready');
  });
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventChunkUserDefinedResponse,
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  BusEventUserDefinedResponse,
  CompleteItemChunk,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
} from '../../../../src/aiChatEntry';
import {
  addChunk,
  completeText,
  describeShared,
  finalChunk,
  finishSend,
  outputTexts,
  partialText,
  partialUserDefined,
  recordEvents,
  startSend,
  textItem,
  textsOf,
  userDefinedItem,
} from '../../helpers';

// @covers instance.messaging.addMessageChunk state.messages
describeShared('addMessageChunk builds a streamed response', (makeDriver) => {
  it('shows each partial_item in messages as it arrives, joining its text', async () => {
    const chat = await makeDriver();
    const { sent } = await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello '));
    expect(chat.messages().map((message) => message.id)).toEqual([
      sent.request.id,
      'r1',
    ]);
    expect(textsOf(chat, 'r1')).toEqual(['Hello ']);
    await addChunk(chat, partialText('r1', 'a', 'world'));
    expect(textsOf(chat, 'r1')).toEqual(['Hello world']);
  });

  it('keeps each item of a response apart and replaces one on its complete_item', async () => {
    const chat = await makeDriver();
    await addChunk(chat, partialText('r1', 'a', 'A1 '));
    await addChunk(chat, partialText('r1', 'b', 'B1 '));
    await addChunk(chat, partialText('r1', 'a', 'A2'));
    expect(textsOf(chat, 'r1')).toEqual(['A1 A2', 'B1 ']);
    await addChunk(chat, completeText('r1', 'a', 'A final'));
    expect(textsOf(chat, 'r1')).toEqual(['A final', 'B1 ']);
    await addChunk(chat, partialText('r1', 'b', 'B2'));
    expect(textsOf(chat, 'r1')).toEqual(['A final', 'B1 B2']);
  });

  it('replaces the streamed message with its final_response', async () => {
    const chat = await makeDriver();
    const { sent } = await startSend(chat, 'hello');
    await addChunk(chat, partialText('r1', 'a', 'Hello '));
    await addChunk(
      chat,
      finalChunk('r1', [textItem('Hello there', 'a'), textItem('Bye', 'b')], {
        request_id: sent.request.id,
      })
    );
    const response = chat
      .messages()
      .find((message) => message.id === 'r1') as MessageResponse;
    expect(outputTexts(response)).toEqual(['Hello there', 'Bye']);
    expect(response.request_id).toBe(sent.request.id);
    expect(chat.messages()).toHaveLength(2);
  });

  it('keeps a complete_item’s stream_stopped flag on the item in messages', async () => {
    const chat = await makeDriver();
    await addChunk(
      chat,
      partialText('r1', 'a', 'Partial ', { cancellable: true })
    );
    await addChunk(
      chat,
      completeText('r1', 'a', 'Partial text', { stream_stopped: true })
    );
    const response = chat.messages()[0] as MessageResponse;
    expect(response.output.generic).toEqual([
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Partial text',
        streaming_metadata: { id: 'a', stream_stopped: true },
      },
    ]);
  });
});

// @covers state.status instance.messaging.addMessageChunk
describeShared('status during a stream', (makeDriver) => {
  it('goes submitted, then streaming at the first chunk, and ready only once the send settles', async () => {
    const chat = await makeDriver();
    expect(chat.status()).toBe('ready');
    const started = await startSend(chat, 'hello');
    expect(chat.status()).toBe('submitted');
    await addChunk(chat, partialText('r1', 'a', 'Hello'));
    expect(chat.status()).toBe('streaming');
    await addChunk(
      chat,
      finalChunk('r1', [textItem('Hello', 'a')], {
        request_id: started.sent.request.id,
      })
    );
    // The response is done, but its sender is still pending.
    expect(chat.status()).toBe('streaming');
    await finishSend(started);
    expect(chat.status()).toBe('ready');
  });

  it('goes streaming and back to ready for a stream with no send', async () => {
    const chat = await makeDriver();
    await addChunk(chat, partialText('r1', 'a', 'Hello'));
    expect(chat.status()).toBe('streaming');
    await addChunk(chat, finalChunk('r1', [textItem('Hello', 'a')]));
    expect(chat.status()).toBe('ready');
  });

  it('stays streaming until every open stream has its final_response', async () => {
    const chat = await makeDriver();
    await addChunk(chat, partialText('r1', 'a', 'One'));
    await addChunk(chat, partialText('r2', 'a', 'Two'));
    await addChunk(chat, finalChunk('r1', [textItem('One', 'a')]));
    expect(chat.status()).toBe('streaming');
    await addChunk(chat, finalChunk('r2', [textItem('Two', 'a')]));
    expect(chat.status()).toBe('ready');
  });
});

// @covers event.pre:receive event.receive instance.messaging.addMessageChunk
describeShared('receive events for a stream', (makeDriver) => {
  it('fires pre:receive then receive once, at final_response only', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await addChunk(chat, partialText('r1', 'a', 'One '));
    await addChunk(chat, partialText('r1', 'a', 'two'));
    await addChunk(chat, completeText('r1', 'a', 'One two'));
    expect(events.types()).toEqual([]);
    await addChunk(chat, finalChunk('r1', [textItem('One two!', 'a')]));
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    const [preReceive] = events.of<BusEventPreReceive>(
      BusEventType.PRE_RECEIVE
    );
    const [receive] = events.of<BusEventReceive>(BusEventType.RECEIVE);
    expect(preReceive.data.id).toBe('r1');
    expect(outputTexts(preReceive.data)).toEqual(['One two!']);
    expect(receive.data.id).toBe('r1');
    expect(outputTexts(receive.data)).toEqual(['One two!']);
  });

  it('stores and hands receive the edits a pre:receive handler made to a final_response', async () => {
    const chat = await makeDriver();
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: (event: BusEventPreReceive) => {
        (event.data.output.generic[0] as { text: string }).text = 'edited';
      },
    });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    await addChunk(chat, partialText('r1', 'a', 'original'));
    await addChunk(chat, finalChunk('r1', [textItem('original', 'a')]));
    expect(
      outputTexts(events.of<BusEventReceive>(BusEventType.RECEIVE)[0].data)
    ).toEqual(['edited']);
    expect(textsOf(chat, 'r1')).toEqual(['edited']);
  });
});

// @covers event.chunk:userDefinedResponse event.userDefinedResponse instance.messaging.addMessageChunk
describeShared('a streamed user_defined item', (makeDriver) => {
  it('fires chunk:userDefinedResponse per chunk, with that chunk’s item, and merges the item in messages', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      BusEventType.USER_DEFINED_RESPONSE,
    ]);
    const first = partialUserDefined('u1', 'ud', { step: 1 });
    const second = partialUserDefined('u1', 'ud', { extra: 2 });
    await addChunk(chat, first);
    await addChunk(chat, second);
    expect(events.types()).toEqual([
      'chunk:userDefinedResponse',
      'chunk:userDefinedResponse',
    ]);
    const chunkEvents = events.of<BusEventChunkUserDefinedResponse>(
      BusEventType.CHUNK_USER_DEFINED_RESPONSE
    );
    // On `main` `messageItem` is the chunk's own partial item, not the item
    // merged so far.
    expect(chunkEvents.map((event) => event.data.messageItem)).toEqual([
      first.partial_item,
      second.partial_item,
    ]);
    expect(chunkEvents.map((event) => event.data.chunk)).toEqual([
      first,
      second,
    ]);
    expect(chunkEvents[0].data.slot).toEqual(expect.any(String));
    expect(chunkEvents[0].data.slot.length).toBeGreaterThan(0);
    expect(chunkEvents[1].data.slot).toBe(chunkEvents[0].data.slot);
    const response = chat.messages()[0] as MessageResponse;
    expect(response.output.generic[0]).toMatchObject({
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { step: 1, extra: 2 },
    });
  });

  it('fires userDefinedResponse once at final_response, after receive, in the chunks’ slot', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await addChunk(chat, partialUserDefined('u1', 'ud', { step: 1 }));
    const [chunkEvent] = events.of<BusEventChunkUserDefinedResponse>(
      BusEventType.CHUNK_USER_DEFINED_RESPONSE
    );
    events.clear();
    const finalItem = userDefinedItem('ud', { step: 2 });
    await addChunk(chat, finalChunk('u1', [finalItem]));
    expect(events.types()).toEqual([
      'pre:receive',
      'receive',
      'userDefinedResponse',
    ]);
    const [done] = events.of<BusEventUserDefinedResponse>(
      BusEventType.USER_DEFINED_RESPONSE
    );
    expect(done.data.message).toEqual(finalItem);
    expect(done.data.fullMessage.id).toBe('u1');
    expect(done.data.state).toBe(MessageState.COMPLETE);
    expect(done.data.slot).toBe(chunkEvent.data.slot);
  });

  it('fires only chunk:userDefinedResponse for a complete_item until final_response', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.RECEIVE,
    ]);
    const item = userDefinedItem('ud', { kind: 'widget' });
    const chunk: CompleteItemChunk = {
      streaming_metadata: { response_id: 'u1' },
      complete_item: item,
    };
    await addChunk(chat, chunk);
    expect(events.types()).toEqual(['chunk:userDefinedResponse']);
    expect(
      events.of<BusEventChunkUserDefinedResponse>(
        BusEventType.CHUNK_USER_DEFINED_RESPONSE
      )[0].data.chunk
    ).toEqual(chunk);
    await addChunk(chat, finalChunk('u1', [item]));
    expect(events.types()).toEqual([
      'chunk:userDefinedResponse',
      'receive',
      'userDefinedResponse',
    ]);
  });
});

// @covers instance.messaging.addMessageChunk state.messages state.status
describeShared('streams without streaming_metadata.id', (makeDriver) => {
  it('keeps the text of two such streams in their own messages', async () => {
    const chat = await makeDriver();
    await addChunk(chat, partialText('r1', undefined, 'First '));
    await addChunk(chat, partialText('r2', undefined, 'Second '));
    await addChunk(chat, partialText('r1', undefined, 'one'));
    await addChunk(chat, partialText('r2', undefined, 'two'));
    expect(chat.messages().map((message) => message.id)).toEqual(['r1', 'r2']);
    expect(textsOf(chat, 'r1')).toEqual(['First one']);
    expect(textsOf(chat, 'r2')).toEqual(['Second two']);
  });

  it('replaces each stream’s item at its own final_response', async () => {
    const chat = await makeDriver();
    await addChunk(chat, partialText('r1', undefined, 'Third'));
    await addChunk(chat, partialText('r2', undefined, 'Fourth'));
    await addChunk(chat, finalChunk('r1', [textItem('Third, final')]));
    expect(textsOf(chat, 'r1')).toEqual(['Third, final']);
    expect(textsOf(chat, 'r2')).toEqual(['Fourth']);
    expect(chat.status()).toBe('streaming');
    await addChunk(chat, finalChunk('r2', [textItem('Fourth, final')]));
    expect(textsOf(chat, 'r1')).toEqual(['Third, final']);
    expect(textsOf(chat, 'r2')).toEqual(['Fourth, final']);
    expect(chat.status()).toBe('ready');
  });
});

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
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  MessageResponse,
  MessageState,
} from '../../../../src/aiChatEntry';
import {
  deferred,
  describeShared,
  outputTexts,
  recordEvents,
  textResponse,
  textsOf,
  upsertText,
} from '../../helpers';

const RECEIVE_EVENTS = [BusEventType.PRE_RECEIVE, BusEventType.RECEIVE];

describe('MessageState', () => {
  // @covers export.aiChatEntry.MessageState
  it('has the three lifecycle values a host passes as strings', () => {
    expect({ ...MessageState }).toEqual({
      STREAMING: 'streaming',
      COMPLETE: 'complete',
      ERROR: 'error',
    });
  });
});

// @covers instance.messaging.upsertMessage state.messages
describeShared('upsertMessage stores the updater result', (makeDriver) => {
  it('gives the updater undefined for a new ID and stores what it returns', async () => {
    const chat = await makeDriver();
    const updater = jest.fn(() => textResponse('first', 'm1'));
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.COMPLETE, updater)
    );
    expect(updater).toHaveBeenCalledTimes(1);
    expect(updater).toHaveBeenCalledWith(undefined);
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
    expect(textsOf(chat, 'm1')).toEqual(['first']);
  });

  it('gives the updater the stored message for an existing ID and replaces it', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'first');
    let previous: MessageResponse | undefined;
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.STREAMING, (prev) => {
        previous = prev;
        return textResponse('second', 'm1');
      })
    );
    expect(previous.id).toBe('m1');
    expect(outputTexts(previous)).toEqual(['first']);
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
    expect(textsOf(chat, 'm1')).toEqual(['second']);
  });

  it('assigns the call ID to a returned message that has none', async () => {
    const chat = await makeDriver();
    let receivedID: string;
    chat.on({
      type: BusEventType.RECEIVE,
      handler: (event: BusEventReceive) => {
        receivedID = event.data.id;
      },
    });
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
        textResponse('no id')
      )
    );
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
    expect(receivedID).toBe('m1');
  });

  it('runs an async updater and stores what it resolves to', async () => {
    const chat = await makeDriver();
    const gate = deferred<MessageResponse>();
    let done: Promise<void>;
    await act(async () => {
      done = chat.messaging.upsertMessage(
        'm1',
        MessageState.COMPLETE,
        () => gate.promise
      );
    });
    expect(chat.messages()).toEqual([]);
    await act(async () => {
      gate.resolve(textResponse('later', 'm1'));
      await done;
    });
    expect(textsOf(chat, 'm1')).toEqual(['later']);
  });

  it('lets the updater edit its argument in place and return it', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'first');
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.STREAMING, (prev) => {
        (prev.output.generic[0] as { text: string }).text = 'edited';
        return prev;
      })
    );
    expect(textsOf(chat, 'm1')).toEqual(['edited']);
  });

  it('hands the updater a copy: edits to it are lost if it throws', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'first');
    let textsDuringUpdater: string[];
    await act(async () => {
      await chat.messaging
        .upsertMessage('m1', MessageState.STREAMING, (prev) => {
          (prev.output.generic[0] as { text: string }).text = 'edited';
          textsDuringUpdater = textsOf(chat, 'm1');
          throw new Error('give up');
        })
        .catch(() => {});
    });
    let nextPrevious: string[];
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.STREAMING, (prev) => {
        nextPrevious = outputTexts(prev);
        return prev;
      })
    );
    expect(textsDuringUpdater).toEqual(['first']);
    expect(nextPrevious).toEqual(['first']);
    expect(textsOf(chat, 'm1')).toEqual(['first']);
  });

  it('keeps two IDs as two messages, in first-write order', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'a', MessageState.STREAMING, 'a1');
    await upsertText(chat, 'b', MessageState.COMPLETE, 'b1');
    await upsertText(chat, 'a', MessageState.COMPLETE, 'a2');
    expect(chat.messages().map((message) => message.id)).toEqual(['a', 'b']);
    expect(textsOf(chat, 'a')).toEqual(['a2']);
  });
});

// @covers instance.messaging.upsertMessage export.aiChatEntry.MessageState
// @covers event.pre:receive event.receive
describeShared('upsertMessage fires pre:receive and receive', (makeDriver) => {
  it('fires pre:receive then receive once for a new ID upserted COMPLETE', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'done');
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    expect(
      events.events.map((event) => (event as BusEventReceive).data.id)
    ).toEqual(['m1', 'm1']);
    expect(
      outputTexts(events.of<BusEventReceive>(BusEventType.RECEIVE)[0].data)
    ).toEqual(['done']);
  });

  it('fires neither for a STREAMING upsert, new or repeated', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    await upsertText(chat, 'm1', MessageState.STREAMING, 'ab');
    expect(events.types()).toEqual([]);
  });

  it('fires once when a STREAMING message moves to COMPLETE', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'ab');
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    expect(
      outputTexts(
        events.of<BusEventPreReceive>(BusEventType.PRE_RECEIVE)[0].data
      )
    ).toEqual(['ab']);
  });

  it('fires nothing for a COMPLETE upsert onto a COMPLETE message, but stores it', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'one');
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'two');
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'three');
    expect(events.types()).toEqual([]);
    expect(textsOf(chat, 'm1')).toEqual(['three']);
  });

  it('fires neither for an ERROR upsert, new or after STREAMING', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'new', MessageState.ERROR, 'failed');
    await upsertText(chat, 'm1', MessageState.STREAMING, 'a');
    await upsertText(chat, 'm1', MessageState.ERROR, 'failed');
    expect(events.types()).toEqual([]);
    expect(chat.messages().map((message) => message.id)).toEqual(['new', 'm1']);
    expect(textsOf(chat, 'm1')).toEqual(['failed']);
  });

  it('fires again when an ERROR message moves to COMPLETE, even after an earlier COMPLETE', async () => {
    // `main` fires on every move into COMPLETE from another state, as the
    // upsertMessage JSDoc says; the MessageState JSDoc says "only on the first
    // transition to COMPLETE".
    const chat = await makeDriver();
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'one');
    await upsertText(chat, 'm1', MessageState.ERROR, 'two');
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'three');
    expect(events.types()).toEqual([
      'pre:receive',
      'receive',
      'pre:receive',
      'receive',
    ]);
  });

  it('stores the message between pre:receive and receive, and resolves after receive', async () => {
    const chat = await makeDriver();
    const seen: string[] = [];
    chat.on([
      {
        type: BusEventType.PRE_RECEIVE,
        handler: () => seen.push(`pre:receive ${chat.messages().length}`),
      },
      {
        type: BusEventType.RECEIVE,
        handler: () => seen.push(`receive ${chat.messages().length}`),
      },
    ]);
    await act(async () => {
      await chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
        textResponse('done', 'm1')
      );
      seen.push('resolved');
    });
    expect(seen).toEqual(['pre:receive 0', 'receive 1', 'resolved']);
  });

  it('stores the edits a pre:receive handler makes', async () => {
    const chat = await makeDriver();
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: (event: BusEventPreReceive) => {
        (event.data.output.generic[0] as { text: string }).text = 'edited';
      },
    });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'original');
    expect(textsOf(chat, 'm1')).toEqual(['edited']);
    expect(
      outputTexts(events.of<BusEventReceive>(BusEventType.RECEIVE)[0].data)
    ).toEqual(['edited']);
  });

  it('fires again for a COMPLETE upsert after removeMessages of that ID, and gives the updater undefined', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'one');
    await act(() => chat.messaging.removeMessages(['m1']));
    expect(chat.messages()).toEqual([]);
    const events = recordEvents(chat, RECEIVE_EVENTS);
    const updater = jest.fn(() => textResponse('two', 'm1'));
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.COMPLETE, updater)
    );
    expect(updater).toHaveBeenCalledWith(undefined);
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    expect(textsOf(chat, 'm1')).toEqual(['two']);
  });
});

// @covers instance.messaging.upsertMessage
describeShared('upsertMessage serializes calls per ID', (makeDriver) => {
  it('runs calls for one ID in call order, each updater seeing the one before', async () => {
    const chat = await makeDriver();
    const gate = deferred<MessageResponse>();
    const seen: string[][] = [];
    let first: Promise<void>;
    let second: Promise<void>;
    let third: Promise<void>;
    await act(async () => {
      first = chat.messaging.upsertMessage(
        'm1',
        MessageState.STREAMING,
        (prev) => {
          seen.push(prev ? outputTexts(prev) : []);
          return gate.promise;
        }
      );
      second = chat.messaging.upsertMessage(
        'm1',
        MessageState.STREAMING,
        (prev) => {
          seen.push(outputTexts(prev));
          return textResponse('ab', 'm1');
        }
      );
      third = chat.messaging.upsertMessage(
        'm1',
        MessageState.COMPLETE,
        (prev) => {
          seen.push(outputTexts(prev));
          return textResponse('abc', 'm1');
        }
      );
    });
    expect(seen).toEqual([[]]);
    await act(async () => {
      gate.resolve(textResponse('a', 'm1'));
      await Promise.all([first, second, third]);
    });
    expect(seen).toEqual([[], ['a'], ['ab']]);
    expect(textsOf(chat, 'm1')).toEqual(['abc']);
  });

  it('does not hold a call for another ID behind a pending one', async () => {
    const chat = await makeDriver();
    const gate = deferred<MessageResponse>();
    let slow: Promise<void>;
    await act(async () => {
      slow = chat.messaging.upsertMessage(
        'slow',
        MessageState.COMPLETE,
        () => gate.promise
      );
    });
    await upsertText(chat, 'fast', MessageState.COMPLETE, 'fast');
    expect(chat.messages().map((message) => message.id)).toEqual(['fast']);
    await act(async () => {
      gate.resolve(textResponse('slow', 'slow'));
      await slow;
    });
    expect(chat.messages().map((message) => message.id)).toEqual([
      'fast',
      'slow',
    ]);
  });

  it('runs the next call for an ID after an updater throws', async () => {
    const chat = await makeDriver();
    let failed: Promise<void>;
    let next: Promise<void>;
    await act(async () => {
      failed = chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () => {
        throw new Error('boom');
      });
      failed.catch(() => {});
      next = chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
        textResponse('after', 'm1')
      );
    });
    await expect(failed).rejects.toThrow('boom');
    await act(() => next);
    expect(textsOf(chat, 'm1')).toEqual(['after']);
  });
});

// @covers instance.messaging.upsertMessage event.pre:receive event.receive
// @covers instance.messaging.addMessage state.messages
describeShared('upsertMessage mixed with addMessage', (makeDriver) => {
  it('fires nothing for a COMPLETE upsert onto a message addMessage delivered', async () => {
    const chat = await makeDriver();
    await act(() => chat.messaging.addMessage(textResponse('added', 'm1')));
    const events = recordEvents(chat, RECEIVE_EVENTS);
    const updater = jest.fn((prev: MessageResponse) => {
      return textResponse(`${outputTexts(prev)[0]} then upserted`, 'm1');
    });
    await act(() =>
      chat.messaging.upsertMessage('m1', MessageState.COMPLETE, updater)
    );
    expect(events.types()).toEqual([]);
    expect(textsOf(chat, 'm1')).toEqual(['added then upserted']);
  });

  it('lets addMessage finish a STREAMING upsert, firing pre:receive and receive once', async () => {
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.STREAMING, 'partial');
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await act(() => chat.messaging.addMessage(textResponse('final', 'm1')));
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'final again');
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
  });

  it('fires pre:receive and receive again when addMessage repeats an ID an upsert completed', async () => {
    // `main` fires them for every addMessage; the MessageState JSDoc says
    // mixing the APIs on one ID does not produce duplicate events.
    const chat = await makeDriver();
    await upsertText(chat, 'm1', MessageState.COMPLETE, 'upserted');
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await act(() => chat.messaging.addMessage(textResponse('added', 'm1')));
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
  });

  it('does not queue addMessage behind a pending upsert for the same ID', async () => {
    const chat = await makeDriver();
    const gate = deferred<MessageResponse>();
    let pending: Promise<void>;
    await act(async () => {
      pending = chat.messaging.upsertMessage(
        'm1',
        MessageState.COMPLETE,
        () => gate.promise
      );
    });
    await act(() => chat.messaging.addMessage(textResponse('added', 'm1')));
    expect(textsOf(chat, 'm1')).toEqual(['added']);
    const events = recordEvents(chat, RECEIVE_EVENTS);
    await act(async () => {
      gate.resolve(textResponse('upserted', 'm1'));
      await pending;
    });
    expect(events.types()).toEqual([]);
    expect(textsOf(chat, 'm1')).toEqual(['upserted']);
  });
});

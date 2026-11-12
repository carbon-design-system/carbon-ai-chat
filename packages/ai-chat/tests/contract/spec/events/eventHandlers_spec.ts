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
  BusEvent,
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  TypeAndHandler,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  advance,
  contractChat,
  contractSetup,
  deferred,
  describeShared,
  finishSend,
  ids,
  startSend,
  textResponse,
} from '../../helpers';

/** Adds a complete text response with the given ID, which fires pre:receive and receive. */
async function add(chat: ContractDriver, id: string): Promise<void> {
  await act(() => chat.messaging.addMessage(textResponse(id, id)));
}

/** Gives the chat time to do something a test expects it not to do. */
async function pause(ms = 50): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** The ID of each event's message, for events that carry one. */
function idsOf(handler: jest.Mock): string[] {
  return handler.mock.calls.map(
    ([event]: [BusEventReceive | BusEventPreReceive]) => event.data.id
  );
}

// @covers instance.on
describeShared('on', (makeDriver) => {
  it('calls a handler with each event of its type', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(handler.mock.calls.map(([event]) => event.type)).toEqual([
      'receive',
      'receive',
    ]);
    expect(idsOf(handler)).toEqual(['r1', 'r2']);
  });

  it('registers every handler in an array', async () => {
    const chat = await makeDriver();
    const order: string[] = [];
    chat.on([
      { type: BusEventType.RECEIVE, handler: () => order.push('receive') },
      {
        type: BusEventType.PRE_RECEIVE,
        handler: () => order.push('pre:receive'),
      },
    ]);
    await add(chat, 'r1');
    expect(order).toEqual(['pre:receive', 'receive']);
  });

  it('runs the handlers for one type in the order they were added', async () => {
    const chat = await makeDriver();
    const order: string[] = [];
    chat.on({ type: BusEventType.RECEIVE, handler: () => order.push('first') });
    chat.on([
      { type: BusEventType.RECEIVE, handler: () => order.push('second') },
      { type: BusEventType.RECEIVE, handler: () => order.push('third') },
    ]);
    chat.once({
      type: BusEventType.RECEIVE,
      handler: () => order.push('once'),
    });
    chat.on({ type: BusEventType.RECEIVE, handler: () => order.push('last') });
    await add(chat, 'r1');
    expect(order).toEqual(['first', 'second', 'third', 'once', 'last']);
  });

  it('calls a handler added twice twice per event', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    chat.on({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    expect(idsOf(handler)).toEqual(['r1', 'r1']);
  });

  it("doesn't call a handler for events of another type", async () => {
    const chat = await makeDriver();
    const onSend = jest.fn();
    const onReceive = jest.fn();
    chat.on([
      { type: BusEventType.SEND, handler: onSend },
      { type: BusEventType.RECEIVE, handler: onReceive },
    ]);
    await add(chat, 'r1');
    expect(onSend).not.toHaveBeenCalled();
    expect(onReceive).toHaveBeenCalledTimes(1);
    await finishSend(await startSend(chat, 'hello'));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onReceive).toHaveBeenCalledTimes(1);
  });

  it('returns an object whose on, off, and once act on the same chat', async () => {
    const chat = await makeDriver();
    const order: string[] = [];
    const removed = jest.fn();
    chat
      .on({ type: BusEventType.RECEIVE, handler: () => order.push('on') })
      .on({ type: BusEventType.RECEIVE, handler: removed })
      .once({ type: BusEventType.RECEIVE, handler: () => order.push('once') })
      .off({ type: BusEventType.RECEIVE, handler: removed })
      .on({ type: BusEventType.RECEIVE, handler: () => order.push('last') });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(order).toEqual(['on', 'once', 'last', 'on', 'last']);
    expect(removed).not.toHaveBeenCalled();
  });

  it('throws for a handler with no type', async () => {
    const chat = await makeDriver();
    expect(() =>
      chat.on({ type: undefined, handler: jest.fn() } as TypeAndHandler)
    ).toThrow();
  });

  it('skips an entry whose handler is not a function, and adds the rest', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    expect(() =>
      chat.on([
        {
          type: BusEventType.RECEIVE,
          handler: 'not a function',
        } as unknown as TypeAndHandler,
        { type: BusEventType.RECEIVE, handler },
      ])
    ).not.toThrow();
    await add(chat, 'r1');
    expect(idsOf(handler)).toEqual(['r1']);
  });
});

// @covers instance.off
describeShared('off', (makeDriver) => {
  it('stops calling a handler', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    chat.off({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r2');
    expect(idsOf(handler)).toEqual(['r1']);
  });

  it('removes only the handler for the type it names', async () => {
    const chat = await makeDriver();
    const shared = jest.fn();
    const other = jest.fn();
    chat.on([
      { type: BusEventType.PRE_RECEIVE, handler: shared },
      { type: BusEventType.RECEIVE, handler: shared },
      { type: BusEventType.RECEIVE, handler: other },
    ]);
    chat.off({ type: BusEventType.RECEIVE, handler: shared });
    await add(chat, 'r1');
    expect(shared.mock.calls.map(([event]) => event.type)).toEqual([
      'pre:receive',
    ]);
    expect(idsOf(other)).toEqual(['r1']);
  });

  it('removes one registration of a handler added twice', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    chat.on({ type: BusEventType.RECEIVE, handler });
    chat.off({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    expect(idsOf(handler)).toEqual(['r1']);
  });

  it('ignores a handler that was never added', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    expect(() => {
      chat.off({ type: BusEventType.RECEIVE, handler: jest.fn() });
      chat.off({ type: BusEventType.SEND, handler: jest.fn() });
      chat.off({ type: BusEventType.PRE_RECEIVE, handler });
    }).not.toThrow();
    await add(chat, 'r1');
    expect(idsOf(handler)).toEqual(['r1']);
  });

  it('removes every handler in an array', async () => {
    const chat = await makeDriver();
    const first = jest.fn();
    const second = jest.fn();
    const kept = jest.fn();
    const handlers: TypeAndHandler[] = [
      { type: BusEventType.PRE_RECEIVE, handler: first },
      { type: BusEventType.RECEIVE, handler: second },
    ];
    chat.on([...handlers, { type: BusEventType.RECEIVE, handler: kept }]);
    chat.off(handlers);
    await add(chat, 'r1');
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(idsOf(kept)).toEqual(['r1']);
  });

  // `TypeAndHandler.handler` is required, but `main` treats a missing one as
  // "remove every handler of this type" (src/chat/events/EventBus.ts:293-296).
  it('removes every handler of a type when given no handler', async () => {
    const chat = await makeDriver();
    const first = jest.fn();
    const second = jest.fn();
    const otherType = jest.fn();
    chat.on([
      { type: BusEventType.RECEIVE, handler: first },
      { type: BusEventType.RECEIVE, handler: second },
      { type: BusEventType.PRE_RECEIVE, handler: otherType },
    ]);
    chat.off({ type: BusEventType.RECEIVE } as TypeAndHandler);
    await add(chat, 'r1');
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(idsOf(otherType)).toEqual(['r1']);
  });

  // The JSDoc says off removes a handler added with once
  // (src/types/instance/EventHandlers.ts:38), but `main` registers a wrapper
  // for once (src/chat/events/EventBus.ts:313-317), so off with the function
  // passed to once matches nothing.
  it("doesn't remove a once handler given the function passed to once", async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.once({ type: BusEventType.RECEIVE, handler });
    chat.off({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(handler)).toEqual(['r1']);
  });
});

// @covers instance.once
describeShared('once', (makeDriver) => {
  it('calls a handler for the first event of its type only', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.once({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(handler)).toEqual(['r1']);
  });

  it('calls a handler once when two events of its type fire back to back', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    const every = jest.fn();
    chat.once({ type: BusEventType.RECEIVE, handler });
    chat.on({ type: BusEventType.RECEIVE, handler: every });
    await act(async () => {
      await Promise.all([
        chat.messaging.addMessage(textResponse('r1', 'r1')),
        chat.messaging.addMessage(textResponse('r2', 'r2')),
      ]);
    });
    expect(idsOf(every)).toEqual(['r1', 'r2']);
    expect(idsOf(handler)).toEqual(['r1']);
  });

  it('adds every handler in an array, each for one event of its own type', async () => {
    const chat = await makeDriver();
    const onPreReceive = jest.fn();
    const onReceive = jest.fn();
    chat.once([
      { type: BusEventType.PRE_RECEIVE, handler: onPreReceive },
      { type: BusEventType.RECEIVE, handler: onReceive },
    ]);
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(onPreReceive)).toEqual(['r1']);
    expect(idsOf(onReceive)).toEqual(['r1']);
  });

  it('calls a handler given to once and to on for each registration', async () => {
    const chat = await makeDriver();
    const handler = jest.fn();
    chat.on({ type: BusEventType.RECEIVE, handler });
    chat.once({ type: BusEventType.RECEIVE, handler });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(handler)).toEqual(['r1', 'r1', 'r2']);
  });
});

// @covers instance.on instance.off
describeShared('handlers while an event runs', (makeDriver) => {
  it('calls a handler added during an event from the next event on', async () => {
    const chat = await makeDriver();
    const added = jest.fn();
    chat.once({
      type: BusEventType.RECEIVE,
      handler: () => {
        chat.on({ type: BusEventType.RECEIVE, handler: added });
      },
    });
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(added)).toEqual(['r2']);
  });

  it('still calls a handler removed during an event for that event, not the next', async () => {
    const chat = await makeDriver();
    const removed = jest.fn();
    chat.on([
      {
        type: BusEventType.RECEIVE,
        handler: () => {
          chat.off({ type: BusEventType.RECEIVE, handler: removed });
        },
      },
      { type: BusEventType.RECEIVE, handler: removed },
    ]);
    await add(chat, 'r1');
    await add(chat, 'r2');
    expect(idsOf(removed)).toEqual(['r1']);
  });

  it('waits for a pre:send handler’s promise before it fires send or calls customSendMessage', async () => {
    const chat = await makeDriver();
    const gate = deferred();
    const onSend = jest.fn();
    chat.on([
      { type: BusEventType.PRE_SEND, handler: () => gate.promise },
      { type: BusEventType.SEND, handler: onSend },
    ]);
    let done: Promise<void>;
    await act(async () => {
      done = chat.send('hello');
    });
    await pause();
    expect(onSend).not.toHaveBeenCalled();
    expect(chat.backend.requests).toHaveLength(0);
    await act(async () => {
      gate.resolve();
    });
    const sent = await chat.backend.next();
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(sent.request.input.text).toBe('hello');
    await finishSend({ sent, done });
  });

  it('waits for a send handler’s promise before it calls customSendMessage', async () => {
    const chat = await makeDriver();
    const gate = deferred();
    chat.on({ type: BusEventType.SEND, handler: () => gate.promise });
    let done: Promise<void>;
    await act(async () => {
      done = chat.send('hello');
    });
    await pause();
    expect(chat.backend.requests).toHaveLength(0);
    await act(async () => {
      gate.resolve();
    });
    const sent = await chat.backend.next();
    expect(sent.request.input.text).toBe('hello');
    await finishSend({ sent, done });
  });

  it('skips the later handlers for an event when one throws, and runs them all for the next', async () => {
    const chat = await makeDriver();
    const thrown = new Error('receive failed');
    const later = jest.fn();
    chat.once({
      type: BusEventType.RECEIVE,
      handler: () => {
        throw thrown;
      },
    });
    chat.on({ type: BusEventType.RECEIVE, handler: later });
    let error: unknown;
    await act(async () => {
      await chat.messaging
        .addMessage(textResponse('r1', 'r1'))
        .catch((caught) => {
          error = caught;
        });
    });
    expect(error).toBe(thrown);
    expect(later).not.toHaveBeenCalled();
    await add(chat, 'r2');
    expect(idsOf(later)).toEqual(['r2']);
  });

  it('holds an event until the handlers for the earlier event of its type settle', async () => {
    const chat = await makeDriver();
    const gate = deferred();
    const seen: string[] = [];
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: async (event: BusEventPreReceive) => {
        seen.push(`start ${event.data.id}`);
        if (event.data.id === 'r1') {
          await gate.promise;
          seen.push('end r1');
        }
      },
    });
    let both: Promise<unknown>;
    await act(async () => {
      both = Promise.all([
        chat.messaging.addMessage(textResponse('r1', 'r1')),
        chat.messaging.addMessage(textResponse('r2', 'r2')),
      ]);
    });
    await pause();
    expect(seen).toEqual(['start r1']);
    await act(async () => {
      gate.resolve();
      await both;
    });
    expect(seen).toEqual(['start r1', 'end r1', 'start r2']);
    expect(ids(chat)).toEqual(['r1', 'r2']);
  });

  it("doesn't hold an event behind a pending handler of another type", async () => {
    const chat = await makeDriver();
    const gate = deferred();
    chat.on({ type: BusEventType.PRE_RECEIVE, handler: () => gate.promise });
    let pending: Promise<void>;
    await act(async () => {
      pending = chat.messaging.addMessage(textResponse('r1', 'r1'));
    });
    const started = await startSend(chat, 'hello');
    expect(started.sent.request.input.text).toBe('hello');
    await finishSend(started);
    await act(async () => {
      gate.resolve();
      await pending;
    });
  });
});

// @covers instance.on
describeShared('a handler waiting on its own event type', (makeDriver) => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects the inner call after 10 seconds and skips its handlers', async () => {
    const chat = await makeDriver();
    jest.useFakeTimers();
    let innerError: unknown;
    let innerSettled = false;
    const handler = jest.fn((event: BusEventReceive) => {
      if (event.data.id !== 'outer') {
        return undefined;
      }
      return chat.messaging.addMessage(textResponse('inner', 'inner')).then(
        () => {
          innerSettled = true;
        },
        (error) => {
          innerSettled = true;
          innerError = error;
        }
      );
    });
    chat.on({ type: BusEventType.RECEIVE, handler });
    let outer: Promise<void>;
    await act(async () => {
      outer = chat.messaging.addMessage(textResponse('outer', 'outer'));
    });
    await advance(9_000);
    expect(innerSettled).toBe(false);
    await advance(1_000);
    await act(() => outer);
    expect(innerError).toBeInstanceOf(Error);
    expect(idsOf(handler)).toEqual(['outer']);
  });
});

describe('handler arguments', () => {
  contractSetup();

  // @covers instance.on
  it('passes the instance as the second argument', async () => {
    const { instance } = await contractChat({
      messaging: { customSendMessage: jest.fn() },
    });
    const handler = jest.fn<void, [BusEvent, unknown]>();
    instance.on({ type: BusEventType.RECEIVE, handler });
    await act(() => instance.messaging.addMessage(textResponse('r1', 'r1')));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(instance);
  });
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKHandle } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../types/messaging/Messages';
import { bounded, gate, nextTurn } from './helpers/lifecycleControl';
import {
  FIXED_TIMESTAMP,
  storedResponse,
  texts,
  withSDK,
} from './helpers/publicContract';

/**
 * A response that draws one text item per entry in `items`, with one
 * `user_defined` reasoning item per entry in `reasoning`.
 */
function reasoningResponse(
  id: string,
  reasoning: string[],
  items: string[] = ['Answer']
): MessageResponse {
  return {
    id,
    history: { timestamp: FIXED_TIMESTAMP },
    output: {
      generic: items.map((text, index) => ({
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: `text-${index}` },
      })),
    },
    message_options: {
      reasoning: {
        content: reasoning.map((value) => ({
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value },
        })),
      },
    },
  };
}

/** A response whose only output item is a `user_defined` item. */
function outputResponse(id: string, value: string): MessageResponse {
  return {
    id,
    history: { timestamp: FIXED_TIMESTAMP },
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value },
        },
      ],
    },
  };
}

function write(
  sdk: ChatSDKHandle,
  id: string,
  build: () => MessageResponse
): Promise<void> {
  return bounded(
    sdk.messaging.upsertMessage(id, MessageState.COMPLETE, build),
    `Native write ${id}`
  );
}

/**
 * Records the `value` of every `userDefinedResponse` the SDK fires, in order.
 * `respond` is the handler's own return, such as a held promise.
 */
function notifications(
  sdk: ChatSDKHandle,
  respond: (
    value: string,
    event: BusEventUserDefinedResponse
  ) => Promise<void> | void = () => undefined
) {
  const values: string[] = [];
  let wake: Array<() => void> = [];
  sdk.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      const value = String(event.data.message.user_defined?.value);
      values.push(value);
      const waiting = wake;
      wake = [];
      waiting.forEach((check) => check());
      return respond(value, event);
    },
  });
  const until = (done: () => boolean, label: string) =>
    bounded(
      new Promise<void>((resolve) => {
        const check = () => (done() ? resolve() : wake.push(check));
        check();
      }),
      label
    );
  return {
    values,
    delivered: (value: string) =>
      until(() => values.includes(value), `Notification "${value}"`),
    count: (count: number) =>
      until(() => values.length >= count, `${count} notifications`),
  };
}

/** Whether the public state lists message `id`. */
const has = (sdk: ChatSDKHandle, id: string) =>
  sdk.state.get().messages.some((message) => message.id === id);

/** Waits until the public state lists message `id`. */
async function stored(sdk: ChatSDKHandle, id: string): Promise<void> {
  let unsubscribe = (): void => undefined;
  try {
    await bounded(
      new Promise<void>((resolve) => {
        unsubscribe = sdk.state.subscribe(() => {
          if (has(sdk, id)) {
            resolve();
          }
        });
        if (has(sdk, id)) {
          resolve();
        }
      }),
      `Stored ${id}`
    );
  } finally {
    unsubscribe();
  }
}

const TWO_ITEMS = ['First item', 'Second item'];

/**
 * A reasoning handler that removes its response or restarts the chat, on a
 * response that draws two items. The sibling item's notification is
 * obsolete once the handler returns, and a fresh write still notifies.
 */
async function reentrantTransition(
  transition: (sdk: ChatSDKHandle) => Promise<void>
) {
  await withSDK(async (sdk) => {
    let pending: Promise<void> | undefined;
    const log = notifications(sdk, (value) => {
      if (value === 'obsolete' && !pending) {
        pending = transition(sdk);
      }
    });
    try {
      // Positive sibling control: without reentry the sibling does notify.
      // Headless delivery notifies once per item the list draws, so two
      // drawn items give two notifications. That count is today's behavior,
      // not the oracle; the reentrant step below is.
      await write(sdk, 'siblings', () =>
        reasoningResponse('siblings', ['sibling'], TWO_ITEMS)
      );
      await log.count(2);
      expect(log.values).toEqual(['sibling', 'sibling']);

      await write(sdk, 'reentrant', () =>
        reasoningResponse('reentrant', ['obsolete'], TWO_ITEMS)
      );
      expect(pending).toBeDefined();
      await bounded(pending, 'Reentrant transition');
      await nextTurn();
      expect(log.values).toEqual(['sibling', 'sibling', 'obsolete']);
      expect(has(sdk, 'reentrant')).toBe(false);

      await write(sdk, 'fresh', () => reasoningResponse('fresh', ['fresh']));
      await log.delivered('fresh');
      expect(log.values).toEqual(['sibling', 'sibling', 'obsolete', 'fresh']);
      expect(texts(storedResponse(sdk.state.get(), 'fresh'))).toEqual([
        'Answer',
      ]);
    } finally {
      await bounded(Promise.allSettled([pending]), 'Owned transition cleanup');
    }
  });
}

describe('SDK reasoning notifications', () => {
  it('delivers reasoning from a native upsert without waiting for its held handler', async () => {
    await withSDK(async (sdk) => {
      const held = gate();
      const writable: boolean[] = [];
      const log = notifications(sdk, (_value, event) => {
        writable.push(!Object.isFrozen(event.data.fullMessage));
        return held.promise;
      });
      try {
        // A write that waited for this handler would never settle here.
        await write(sdk, 'native', () =>
          reasoningResponse('native', ['native'])
        );
        expect(log.values).toEqual(['native']);
        expect(writable).toEqual([true]);
        expect(texts(storedResponse(sdk.state.get(), 'native'))).toEqual([
          'Answer',
        ]);
      } finally {
        held.resolve();
      }
    });
  });

  it('holds a later output callback, but not the reasoning write, behind a held reasoning handler', async () => {
    await withSDK(async (sdk) => {
      const held = gate();
      const log = notifications(sdk, (value) =>
        value === 'reasoning' ? held.promise : undefined
      );
      let settled = false;
      let output: Promise<void> | undefined;
      try {
        await write(sdk, 'reasoning-owner', () =>
          reasoningResponse('reasoning-owner', ['reasoning'])
        );
        await log.delivered('reasoning');
        output = sdk.messaging
          .upsertMessage('output', MessageState.COMPLETE, () =>
            outputResponse('output', 'output')
          )
          .then(() => {
            settled = true;
          });
        void output.catch((): void => undefined);
        await stored(sdk, 'output');
        await nextTurn();
        expect(log.values).toEqual(['reasoning']);
        expect(settled).toBe(false);
        held.resolve();
        await bounded(output, 'Output write after the reasoning handler');
        expect(settled).toBe(true);
        expect(log.values).toEqual(['reasoning', 'output']);
      } finally {
        held.resolve();
        await bounded(Promise.allSettled([output]), 'Owned output cleanup');
      }
    });
  });

  it('notifies reasoning again when a removed response is written again', async () => {
    await withSDK(async (sdk) => {
      const log = notifications(sdk);
      await write(sdk, 'reinserted', () =>
        reasoningResponse('reinserted', ['first'])
      );
      await log.delivered('first');
      await bounded(
        sdk.messaging.removeMessages(['reinserted']),
        'Public removal'
      );
      expect(has(sdk, 'reinserted')).toBe(false);
      await write(sdk, 'reinserted', () =>
        reasoningResponse('reinserted', ['second'])
      );
      await log.delivered('second');
      await nextTurn();
      expect(log.values).toEqual(['first', 'second']);
    });
  });

  it('notifies reasoning only once a stored silent response becomes visible', async () => {
    await withSDK(async (sdk) => {
      const log = notifications(sdk);
      await write(sdk, 'hidden', () => ({
        ...reasoningResponse('hidden', ['reasoning']),
        history: { timestamp: FIXED_TIMESTAMP, silent: true },
      }));
      expect(has(sdk, 'hidden')).toBe(true);
      await nextTurn();
      expect(log.values).toEqual([]);
      await write(sdk, 'hidden', () =>
        reasoningResponse('hidden', ['reasoning'])
      );
      await log.delivered('reasoning');
      await write(sdk, 'hidden', () =>
        reasoningResponse('hidden', ['reasoning'])
      );
      await nextTurn();
      expect(log.values).toEqual(['reasoning']);
    });
  });

  it('stops sibling reasoning notifications when a reasoning handler removes its response', async () => {
    await reentrantTransition((sdk) =>
      sdk.messaging.removeMessages(['reentrant'])
    );
  });

  it('stops sibling reasoning notifications when a reasoning handler restarts the conversation', async () => {
    await reentrantTransition((sdk) => sdk.messaging.restartConversation());
  });
});

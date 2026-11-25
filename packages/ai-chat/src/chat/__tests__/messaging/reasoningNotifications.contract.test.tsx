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
  BusEventType,
  MessageResponseTypes,
  MessageState,
  type BusEventUserDefinedResponse,
  type ChatInstance,
  type GenericItem,
  type MessageResponse,
  type TypeAndHandler,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  deferred,
  partialText,
  pause,
  responseOf,
  textItem,
  userDefinedItem,
  type ContractMount,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

function reasoningItems(values: string[]): GenericItem[] {
  return values.map((value) => ({
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value },
  })) as GenericItem[];
}

function reasoningResponse(id: string, values: string[]): MessageResponse {
  return {
    ...responseOf(id, [textItem('Answer', 'answer')]),
    message_options: { reasoning: { content: reasoningItems(values) } },
  };
}

/**
 * Records the `value` of every `userDefinedResponse` the chat fires, in order.
 * `respond` is the handler's own return, such as a held promise.
 */
function notifications(
  instance: ChatInstance,
  respond: (value: string) => Promise<void> | void = () => undefined
) {
  const values: string[] = [];
  const listener: TypeAndHandler = {
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      const value = String(event.data.message.user_defined?.value);
      values.push(value);
      return respond(value);
    },
  };
  instance.on(listener);
  return { values, stop: () => instance.off(listener) };
}

describe('public mounted reasoning notifications', () => {
  contractSetup();

  it('holds a later output callback, but not the reasoning write, behind a held reasoning handler', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const entered = deferred();
    const held = deferred();
    const log = notifications(mount.instance, (value) => {
      if (value === 'reasoning') {
        entered.resolve();
        return held.promise;
      }
      return undefined;
    });
    let settled = false;
    let output: Promise<void> | undefined;
    try {
      await act(() =>
        bounded(
          mount.instance.messaging.addMessage(
            reasoningResponse('reasoning-owner', ['reasoning'])
          ),
          'Legacy reasoning write'
        )
      );
      await bounded(entered.promise, 'Held mounted reasoning handler');
      await act(async () => {
        output = mount.instance.messaging
          .upsertMessage('output', MessageState.COMPLETE, () =>
            responseOf('output', [
              userDefinedItem('output-item', { value: 'output' }),
            ])
          )
          .then(() => {
            settled = true;
          });
        void output.catch((): void => undefined);
      });
      await waitFor(() =>
        expect(
          mount.instance.state.get().messages.some(({ id }) => id === 'output')
        ).toBe(true)
      );
      expect(log.values).toEqual(['reasoning']);
      expect(settled).toBe(false);
      await act(async () => {
        held.resolve();
        await bounded(output, 'Output write after the reasoning handler');
      });
      expect(settled).toBe(true);
      expect(log.values).toEqual(['reasoning', 'output']);
    } finally {
      held.resolve();
      log.stop();
      try {
        await act(async () => {
          await bounded(Promise.allSettled([output]), 'Owned output cleanup');
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('notifies a reasoning position that a later chunk appends', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const log = notifications(mount.instance);
    try {
      await addChunk(mount.instance, {
        ...partialText('appended', 'answer', 'Answer'),
        partial_response: {
          message_options: {
            reasoning: { content: reasoningItems(['first']) },
          },
        },
      });
      await waitFor(() => expect(log.values).toEqual(['first']));
      await addChunk(mount.instance, {
        ...partialText('appended', 'answer', ' more'),
        partial_response: {
          message_options: {
            reasoning: { content: reasoningItems(['first', 'new']) },
          },
        },
      });
      await waitFor(() => expect(log.values).toEqual(['first', 'new']));
      // Give a late duplicate from the second chunk's update a chance to fire.
      await pause();
      expect(log.values).toEqual(['first', 'new']);
    } finally {
      log.stop();
      await act(async () => mount.unmount());
    }
  });

  it('notifies reasoning written while a reused chat is released once on the adopting mount, and never repeats the earlier mount reasoning', async () => {
    const namespace = 'reasoning-reuse-handoff';
    const options = {
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    };
    type Delivery = { value: string; slot: string | undefined };
    const recorder = (deliveries: Delivery[]): TypeAndHandler => ({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: BusEventUserDefinedResponse) => {
        deliveries.push({
          value: String(event.data.message.user_defined?.value),
          slot: event.data.slot,
        });
      },
    });
    const values = (deliveries: Delivery[]) =>
      deliveries.map(({ value }) => value);
    const firstMount: Delivery[] = [];
    const secondMount: Delivery[] = [];
    const first = await contractChat({
      ...options,
      // Long enough that a slow adopting mount still finds it.
      lifecycle: { reuseInstance: true, releaseGraceMs: 10_000 },
    });
    let second: ContractMount | undefined;
    try {
      first.instance.on(recorder(firstMount));
      await act(() =>
        bounded(
          first.instance.messaging.addMessage(
            reasoningResponse('mounted-reasoning', ['first'])
          ),
          'Mounted reasoning write'
        )
      );
      await waitFor(() => expect(values(firstMount)).toEqual(['first']));
      expect(firstMount[0].slot).toBeTruthy();
      // Released, not destroyed: the chat waits for the next mount.
      await act(async () => first.unmount());
      await act(() =>
        bounded(
          first.instance.messaging.addMessage(
            reasoningResponse('released-reasoning', ['second'])
          ),
          'Released reasoning write'
        )
      );
      expect(
        first.instance.state
          .get()
          .messages.some(({ id }) => id === 'released-reasoning')
      ).toBe(true);
      second = await contractChat({
        ...options,
        lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
        onBeforeRender: (instance: ChatInstance) => {
          instance.on(recorder(secondMount));
        },
      });
      await waitFor(() => expect(values(secondMount)).toEqual(['second']));
      expect(secondMount[0].slot).toBeTruthy();
      expect(second.instance.state.get().messages.map(({ id }) => id)).toEqual([
        'mounted-reasoning',
        'released-reasoning',
      ]);
      // Give a late duplicate from the adopting mount's render time to fire.
      await pause();
      expect(values(secondMount)).toEqual(['second']);
      expect(values(firstMount)).toEqual(['first']);
    } finally {
      await act(async () => {
        first.unmount();
        second?.unmount();
      });
    }
  });
});

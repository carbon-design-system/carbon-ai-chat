/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { type MessageRequest } from '../../../aiChatEntry';
import {
  advance,
  contractChat,
  contractSetup,
  deferred,
  textResponse,
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

describe('public no-reply loading generations', () => {
  contractSetup();

  it('replaces both silent and already-visible loading work when another real send starts', async () => {
    const thirdEntered = deferred();
    const finishThird = deferred();
    const requests: MessageRequest[] = [];
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        messageLoadingIndicatorTimeoutSecs: 1,
        messageTimeoutSecs: 0,
        customSendMessage: async (request) => {
          requests.push(request);
          if (request.input.text === 'Third generation') {
            thirdEntered.resolve();
            await finishThird.promise;
          }
        },
      },
    });
    let third = Promise.resolve();
    const count = () => mount.instance.getState().isMessageLoadingCounter;
    vi.useFakeTimers();
    try {
      await act(() => mount.instance.messaging.send('First generation'));
      await advance(500);
      await act(() => mount.instance.messaging.send('Second generation'));
      await advance(500);
      expect(count()).toBe(0);
      await advance(500);
      expect(count()).toBe(1);
      await act(async () => {
        third = mount.instance.messaging.send('Third generation');
        void third.catch((): void => undefined);
        await bounded(thirdEntered.promise, 'Third transport entry');
      });
      expect(count()).toBe(0);
      await advance(999);
      expect(count()).toBe(0);
      await advance(1);
      expect(count()).toBe(1);
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Third generation answer', 'third-answer', {
            request_id: requests[2].id,
          })
        )
      );
      expect(count()).toBe(0);
      await act(async () => {
        finishThird.resolve();
        await bounded(third, 'Third send');
      });
      await advance(2000);
      expect(count()).toBe(0);
      expect(requests.map(({ input }) => input.text)).toEqual([
        'First generation',
        'Second generation',
        'Third generation',
      ]);
    } finally {
      finishThird.resolve();
      try {
        await bounded(Promise.allSettled([third]), 'Owned send cleanup');
      } finally {
        try {
          await act(async () => mount.unmount());
        } finally {
          vi.useRealTimers();
        }
      }
    }
  });
});

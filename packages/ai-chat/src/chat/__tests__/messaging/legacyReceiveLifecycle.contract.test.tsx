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
  type BusEventUserDefinedResponse,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  deferred,
  mainPanelText,
  responseOf,
  textItem,
  textResponse,
  userDefinedItem,
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

describe('public legacy receive lifecycle', () => {
  contractSetup();

  it('accepts the same caller object after addMessage freezes it and delivers receive again', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    const message = textResponse(
      'Same frozen response',
      'same-frozen-response'
    );
    let receives = 0;
    const listener = {
      type: BusEventType.RECEIVE,
      handler: () => {
        receives += 1;
      },
    };
    mount.instance.on(listener);
    try {
      await act(() => mount.instance.messaging.addMessage(message));
      expect(Object.isFrozen(message)).toBe(true);
      await act(() => mount.instance.messaging.addMessage(message));
      expect(receives).toBe(2);
      expect(
        mount.instance.state
          .get()
          .messages.filter(({ id }) => id === message.id)
      ).toHaveLength(1);
      expect(
        mount.instance.state.get().messages.find(({ id }) => id === message.id)
      ).toMatchObject({
        output: { generic: [{ text: 'Same frozen response' }] },
      });
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });

  it('resolves receive before a held item callback and keeps a newer response active after the old reveal finishes', async () => {
    const entered = deferred();
    const release = deferred();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const listener = {
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: BusEventUserDefinedResponse): Promise<void> | void => {
        if (event.data.fullMessage.id === 'older-reveal') {
          entered.resolve();
          return release.promise;
        }
        return undefined;
      },
    };
    mount.instance.on(listener);
    let receipt = Promise.resolve();
    try {
      await act(async () => {
        receipt = mount.instance.messaging.addMessage(
          responseOf('older-reveal', [
            userDefinedItem('gate', { value: 'held callback' }),
            textItem('Later item from older response', 'later'),
          ])
        );
        void receipt.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Actual item callback entry');
      await bounded(receipt, 'Legacy receipt while callback is held');
      const accepted = mount.instance.state.get();
      expect(
        accepted.messages.find(({ id }) => id === 'older-reveal')
      ).toMatchObject({
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'held callback' },
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Later item from older response',
            },
          ],
        },
      });
      expect(mainPanelText()).not.toContain('Later item from older response');
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Newest response', 'newer-response')
        )
      );
      await waitFor(() => expect(mainPanelText()).toContain('Newest response'));
      expect(accepted.messages.map(({ id }) => id)).toEqual(['older-reveal']);
      expect(mount.instance.state.get().activeResponseId).toBe(
        'newer-response'
      );
      await act(async () => {
        release.resolve();
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Later item from older response')
      );
      expect(mount.instance.state.get().activeResponseId).toBe(
        'newer-response'
      );
    } finally {
      release.resolve();
      try {
        await bounded(Promise.allSettled([receipt]), 'Owned legacy receipt');
      } finally {
        mount.instance.off(listener);
        await act(async () => mount.unmount());
      }
    }
  });
});

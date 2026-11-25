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
  type BusEventCustomFooterSlot,
  type BusEventReceive,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  mainPanelText,
  responseOf,
  textItem,
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

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function footerResponse(id: string, text: string) {
  return responseOf(id, [
    {
      ...textItem(text),
      message_item_options: {
        custom_footer_slot: { is_on: true, slot_name: `${id}-footer` },
      },
    },
  ]);
}

describe('public stale footer callbacks', () => {
  contractSetup();

  it('preserves a restarted footer rejection without restoring its late edits and accepts a current footer', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const entered = gate();
    const release = gate();
    const failure = new Error('Held footer rejected after restart');
    const receives: string[] = [];
    const footer = {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: async (event: BusEventCustomFooterSlot) => {
        if (
          event.data.messageItem.response_type !== MessageResponseTypes.TEXT ||
          !('text' in event.data.messageItem)
        ) {
          throw new Error('Expected the public text footer item');
        }
        if (event.data.message.id === 'held-footer') {
          entered.resolve();
          await release.promise;
          event.data.messageItem.text = 'Late footer edit';
          throw failure;
        }
        event.data.messageItem.text = 'Current footer accepted';
      },
    };
    const receive = {
      type: BusEventType.RECEIVE,
      handler: (event: BusEventReceive) => {
        receives.push(event.data.id);
      },
    };
    mount.instance.on([footer, receive]);
    const owned: Promise<unknown>[] = [];
    let settled = false;
    let observed = Promise.resolve();
    let rejected = Promise.resolve();
    try {
      await act(async () => {
        const pending = mount.instance.messaging.upsertMessage(
          'held-footer',
          MessageState.COMPLETE,
          () => footerResponse('held-footer', 'Before held footer')
        );
        observed = pending.then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          }
        );
        rejected = expect(pending).rejects.toBe(failure);
        void rejected.catch((): void => undefined);
        owned.push(pending, observed, rejected);
      });
      await bounded(entered.promise, 'Held footer entry');
      expect(settled).toBe(false);
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'held-footer')
      ).toMatchObject({
        output: { generic: [{ text: 'Before held footer' }] },
      });
      await act(async () => {
        const restart = mount.instance.messaging.restartConversation();
        owned.push(restart);
        await bounded(restart, 'Completed host restart');
        const barrier = mount.instance.messaging.upsertMessage(
          'current-barrier',
          MessageState.COMPLETE,
          () =>
            responseOf('current-barrier', [textItem('Current text barrier')])
        );
        owned.push(barrier);
        await bounded(barrier, 'Non-footer current text barrier');
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current text barrier')
      );
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'held-footer')
      ).toBe(false);
      await act(async () => {
        release.resolve();
        await bounded(rejected, 'Original held footer rejection');
        await bounded(observed, 'Held footer settlement');
      });
      expect(settled).toBe(true);
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'held-footer')
      ).toBe(false);
      expect(mainPanelText()).not.toContain('Late footer edit');
      expect(receives).toEqual(['current-barrier']);
      await act(async () => {
        const current = mount.instance.messaging.upsertMessage(
          'current-footer',
          MessageState.COMPLETE,
          () => footerResponse('current-footer', 'Before current footer')
        );
        owned.push(current);
        await bounded(current, 'Current footer write');
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current footer accepted')
      );
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'current-footer')
      ).toMatchObject({
        output: { generic: [{ text: 'Current footer accepted' }] },
      });
      expect(receives).toEqual(['current-barrier', 'current-footer']);
    } finally {
      release.resolve();
      try {
        await act(async () => {
          await bounded(Promise.allSettled(owned), 'Owned footer cleanup');
        });
      } finally {
        mount.instance.off([footer, receive]);
        await act(async () => mount.unmount());
      }
    }
  });
});

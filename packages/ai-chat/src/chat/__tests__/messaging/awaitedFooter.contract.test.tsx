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
  MessageState,
  type BusEventCustomFooterSlot,
  type TextItem,
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

describe('public awaited native footer', () => {
  contractSetup();

  it('awaits the actual host footer callback before receive, commits its edit and settles the write', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const entered = gate();
    const release = gate();
    const trace: string[] = [];
    const footer = {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: async (event: BusEventCustomFooterSlot) => {
        expect(Object.isFrozen(event.data.message)).toBe(false);
        trace.push('footer:start');
        entered.resolve();
        await release.promise;
        (event.data.messageItem as TextItem).text = 'After awaited footer';
        trace.push('footer:end');
      },
    };
    const receive = {
      type: BusEventType.RECEIVE,
      handler: () => {
        trace.push('receive');
      },
    };
    mount.instance.on([footer, receive]);
    let work = Promise.resolve();
    let settled = false;
    try {
      await act(async () => {
        work = mount.instance.messaging
          .upsertMessage('awaited-footer', MessageState.COMPLETE, () =>
            responseOf('awaited-footer', [
              {
                ...textItem('Before footer'),
                message_item_options: {
                  custom_footer_slot: {
                    is_on: true,
                    slot_name: 'awaited-owner-footer',
                  },
                },
              },
            ])
          )
          .then(() => {
            settled = true;
          });
        void work.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Footer callback entry');
      expect(trace).toEqual(['footer:start']);
      expect(settled).toBe(false);
      await act(async () => {
        release.resolve();
        await bounded(work, 'Footer write settlement');
      });
      expect(trace).toEqual(['footer:start', 'footer:end', 'receive']);
      expect(settled).toBe(true);
      await waitFor(() =>
        expect(mainPanelText()).toContain('After awaited footer')
      );
    } finally {
      release.resolve();
      try {
        await bounded(Promise.allSettled([work]), 'Owned footer write cleanup');
      } finally {
        mount.instance.off([footer, receive]);
        await act(async () => mount.unmount());
      }
    }
  });
});

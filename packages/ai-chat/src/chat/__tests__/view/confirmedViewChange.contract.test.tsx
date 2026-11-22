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
  BusEventType,
  ViewType,
  type BusEventViewPreChange,
} from '../../../aiChatEntry';
import { contractChat, contractSetup, deferred } from '../helpers/contract';

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('public view-change confirmation', () => {
  contractSetup();

  it('awaits a consumer decision to keep the launcher and permits the later unguarded main-window change', async () => {
    const entered = deferred();
    const release = deferred();
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    const handler = {
      type: BusEventType.VIEW_PRE_CHANGE as const,
      handler: async (event: BusEventViewPreChange) => {
        entered.resolve();
        await release.promise;
        event.cancel = true;
      },
    };
    mount.instance.on(handler);
    let changing: Promise<void>;
    try {
      const before = mount.instance.state.get().viewState;
      expect(before.mainWindow).toBe(false);
      await act(async () => {
        changing = mount.instance.changeView(ViewType.MAIN_WINDOW);
        void changing.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Actual public view confirmation');
      expect(mount.instance.state.get().viewState).toEqual(before);
      await act(async () => {
        release.resolve();
        await bounded(changing, 'Cancelled public view change');
      });
      expect(mount.instance.state.get().viewState).toEqual(before);
      mount.instance.off(handler);
      await act(() => mount.instance.changeView(ViewType.MAIN_WINDOW));
      expect(mount.instance.state.get().viewState.mainWindow).toBe(true);
    } finally {
      release.resolve();
      mount.instance.off(handler);
      try {
        await bounded(
          Promise.allSettled([changing]),
          'View confirmation cleanup'
        );
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});

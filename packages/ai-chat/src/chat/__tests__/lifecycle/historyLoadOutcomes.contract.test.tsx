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
  OnErrorType,
  ViewType,
  type ChatInstance,
  type HistoryItem,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  deferred,
  fakeBackend,
  mainPanelText,
  responseOf,
  textItem,
} from '../helpers/contract';

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

function watch<T>(work: Promise<T>): Promise<T> {
  void work.catch((): void => undefined);
  return work;
}

describe('public first history load outcomes', () => {
  contractSetup();

  it('drops history released after a restart began during the first load and starts a usable welcome conversation', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    let loads = 0;
    const backend = fakeBackend({ autoResolve: true });
    const mount = await contractChat({
      messaging: {
        customSendMessage: backend.customSendMessage,
        customLoadHistory: () => {
          loads += 1;
          entered.resolve();
          return history.promise;
        },
      },
    });
    let opening: Promise<void>;
    let restarting: Promise<void>;
    try {
      await act(async () => {
        opening = watch(mount.instance.changeView(ViewType.MAIN_WINDOW));
      });
      await bounded(entered.promise, 'First history load');
      await act(async () => {
        restarting = watch(mount.instance.messaging.restartConversation());
      });
      await waitFor(() =>
        expect(mount.instance.state.get().isRestarting).toBe(true)
      );
      expect(backend.requests).toHaveLength(0);

      await act(async () => {
        history.resolve([
          {
            message: responseOf('old-history', [
              textItem('Released old history'),
            ]),
            time: new Date().toISOString(),
          },
        ]);
        await bounded(
          Promise.all([opening, restarting]),
          'Open and restart after the released history'
        );
      });
      await waitFor(() => expect(backend.requests).toHaveLength(1));
      expect(backend.requests[0].request.history?.is_welcome_request).toBe(
        true
      );
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      expect(loads).toBe(1);
      expect(mount.instance.state.get().isRestarting).toBe(false);
      expect(
        mount.instance.state.get().messages.map(({ id }) => id)
      ).not.toContain('old-history');
      expect(mainPanelText()).not.toContain('Released old history');

      await act(() => mount.instance.send('After the restart'));
      expect(backend.requests).toHaveLength(2);
      expect(backend.requests[1].request.input.text).toBe('After the restart');
      await waitFor(() =>
        expect(mainPanelText()).toContain('After the restart')
      );
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      history.resolve([]);
      try {
        await act(() =>
          bounded(Promise.allSettled([opening, restarting]), 'Load cleanup')
        );
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('publishes a failed first history load once, with its status, as a frozen error that has no messageID and keeps the loader Error', async () => {
    const failure = new Error('History service unavailable');
    const errors: OnErrorData[] = [];
    const published: [string, unknown][] = [];
    const backend = fakeBackend({ autoResolve: true });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    let unsubscribe = (): void => undefined;
    const mount = await contractChat({
      openChatByDefault: true,
      onError: (error): void => {
        errors.push(error);
      },
      onBeforeRender: (instance: ChatInstance) => {
        unsubscribe = instance.state.subscribe(() => {
          const { status, error } = instance.state.get();
          published.push([status, error]);
        });
      },
      messaging: {
        customSendMessage: backend.customSendMessage,
        customLoadHistory: () => Promise.reject(failure),
      },
    });
    try {
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('error')
      );
      expect(errors).toHaveLength(1);
      const { error } = mount.instance.state.get();
      expect(error).toEqual(errors[0]);
      expect(error).toMatchObject({ errorType: OnErrorType.HYDRATION });
      expect(error).not.toHaveProperty('messageID');
      expect(Object.isFrozen(error)).toBe(true);
      expect(error?.otherData).toBe(failure);
      expect(Object.isFrozen(failure)).toBe(false);
      // The status and its error arrive in the same publication.
      expect(published).toContainEqual(['error', error]);
      const errorStatusWithoutError = published.some(
        ([status, value]) => status === 'error' && !value
      );
      expect(errorStatusWithoutError).toBe(false);
      expect(backend.requests).toHaveLength(0);
    } finally {
      unsubscribe();
      log.mockRestore();
      await act(async () => mount.unmount());
    }
  });
});

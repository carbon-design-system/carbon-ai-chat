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
  OnErrorType,
  type HistoryItem,
  type OnErrorData,
  type PublicConfig,
  type ServiceDesk,
} from '../../../aiChatEntry';
import {
  contractChat,
  contractSetup,
  deferred,
  pause,
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

function integration() {
  let starts = 0;
  const factory: NonNullable<PublicConfig['serviceDeskFactory']> = async () => {
    const desk: ServiceDesk = {
      getName: () => 'Lazy public start desk',
      startChat: async () => {
        starts += 1;
      },
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    return desk;
  };
  return {
    factory,
    get starts() {
      return starts;
    },
  };
}

describe('public lazy host agent start', () => {
  contractSetup();

  it('loads real closed-host history before starting the desk without a welcome request', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    const desk = integration();
    const sent: string[] = [];
    const mount = await contractChat({
      serviceDeskFactory: desk.factory,
      messaging: {
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
        customSendMessage: (request): void => {
          sent.push(request.input.text);
        },
      },
    });
    let starting: Promise<void>;
    try {
      await act(async () => {
        starting = watch(mount.instance.serviceDesk.startConversation());
      });
      await bounded(entered.promise, 'Closed-host history entry');
      expect(desk.starts).toBe(0);
      await act(async () => {
        history.resolve([]);
        await bounded(starting, 'Start after actual history');
      });
      expect(desk.starts).toBe(1);
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
      expect(sent).toEqual([]);
      await act(() => mount.instance.serviceDesk.endConversation());
      await act(() => mount.instance.messaging.send('Usable loaded assistant'));
      expect(sent).toEqual(['Usable loaded assistant']);
    } finally {
      history.resolve([]);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([starting]),
            'Owned lazy start cleanup'
          );
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('rejects a public start abandoned by actual host removal while its history loader is held', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    const desk = integration();
    const mount = await contractChat({
      serviceDeskFactory: desk.factory,
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
      },
    });
    let starting: Promise<void>;
    let removed = false;
    try {
      await act(async () => {
        starting = watch(mount.instance.serviceDesk.startConversation());
      });
      await bounded(entered.promise, 'Removable actual history load');
      await act(async () => mount.unmount());
      removed = true;
      history.resolve([]);
      await expect(
        bounded(starting, 'Start after actual removal')
      ).rejects.toThrow('The chat was removed');
      expect(desk.starts).toBe(0);
    } finally {
      history.resolve([]);
      try {
        await bounded(Promise.allSettled([starting]), 'Removed load cleanup');
      } finally {
        if (!removed) {
          await act(async () => mount.unmount());
        }
      }
    }
  });

  it('rejects the old start when public restart invalidates a real held history load and allows a current start', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    const desk = integration();
    const mount = await contractChat({
      serviceDeskFactory: desk.factory,
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
      },
    });
    let starting: Promise<void>;
    let restarting: Promise<void>;
    const restartEntered = deferred();
    const preRestart = {
      type: BusEventType.PRE_RESTART_CONVERSATION as const,
      handler: (): void => {
        restartEntered.resolve();
      },
    };
    mount.instance.on(preRestart);
    try {
      await act(async () => {
        starting = watch(mount.instance.serviceDesk.startConversation());
      });
      await bounded(entered.promise, 'Restarted actual history entry');
      await act(async () => {
        restarting = watch(mount.instance.messaging.restartConversation());
      });
      await bounded(restartEntered.promise, 'Public pre-restart delivery');
      // Finish that nonblocking event's microtasks while real history stays held.
      await pause(0);
      history.resolve([]);
      await expect(
        bounded(starting, 'Invalidated public start')
      ).rejects.toThrow('The conversation restarted while the chat loaded');
      await act(() => bounded(restarting, 'Completed public restart'));
      expect(desk.starts).toBe(0);
      await act(() => mount.instance.serviceDesk.startConversation());
      expect(desk.starts).toBe(1);
      expect(mount.instance.state.get().humanAgent.isConnecting).toBe(true);
    } finally {
      history.resolve([]);
      mount.instance.off(preRestart);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([starting, restarting]),
            'Restart load cleanup'
          );
          await mount.instance.serviceDesk.endConversation();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('returns the original real history failure from a public start and reports that failure once', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = deferred();
    const desk = integration();
    const failure = new Error('Consumer history service unavailable');
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      onError: (error): void => {
        errors.push(error);
      },
      serviceDeskFactory: desk.factory,
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
      },
    });
    let starting: Promise<void>;
    try {
      await act(async () => {
        starting = watch(mount.instance.serviceDesk.startConversation());
      });
      await bounded(entered.promise, 'Failing actual history entry');
      history.reject(failure);
      await expect(
        bounded(starting, 'Start after history failure')
      ).rejects.toBe(failure);
      await waitFor(() => expect(errors).toHaveLength(1));
      expect(errors[0]).toMatchObject({
        errorType: OnErrorType.HYDRATION,
        otherData: failure,
      });
      expect(desk.starts).toBe(0);
    } finally {
      history.resolve([]);
      try {
        await bounded(Promise.allSettled([starting]), 'Failed load cleanup');
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});

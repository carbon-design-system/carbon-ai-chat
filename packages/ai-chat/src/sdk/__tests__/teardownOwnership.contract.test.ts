/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKHandle, ChatSDKHandlers } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import { UserType } from '../../types/messaging/Messages';
import {
  BusEventType,
  type BusEventHumanAgentEndChat,
  type BusEventHumanAgentPreEndChat,
} from '../../types/events/eventBusTypes';
import { textResponse } from './helpers/publicContract';
import {
  bounded,
  controlTimeouts,
  deskIntegration,
  gate,
  nextTurn,
  sdkScope,
} from './helpers/lifecycleControl';

type Connection = NonNullable<
  NonNullable<ChatSDKConfig['humanAgentState']>['initialState']
>;
type Transport = NonNullable<
  NonNullable<ChatSDKConfig['messaging']>['customSendMessage']
>;

const scope = sdkScope();

afterEach(() => {
  scope.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SDK teardown ownership', () => {
  it('keeps a released handle away from its adopted chat', async () => {
    const namespace = 'owner-released-handle';
    const first = await scope.create({ namespace });
    const seen: string[] = [];
    const selected: number[] = [];
    const original: ChatSDKHandlers = {
      type: BusEventType.SEND,
      handler: () => {
        seen.push('original');
      },
    };
    first.on(original);
    const unsubscribe = first.state.subscribe(() => {
      seen.push('state');
    });
    const unselect = first.state.select(
      (state) => state.messages.length,
      (count) => {
        selected.push(count);
      }
    );
    try {
      await first.messaging.send('positive delivery');
      expect(seen).toContain('original');
      expect(seen).toContain('state');
      expect(selected).toContain(1);
      first.release();
      const frozen = first.state.get();
      seen.length = 0;
      selected.length = 0;
      expect(first.off(original)).toBe(first);
      first.on({
        type: BusEventType.SEND,
        handler: () => {
          seen.push('late');
        },
      });
      const current = await scope.create({ namespace, isReadonly: true });
      await current.messaging.upsertMessage(
        'current',
        MessageState.COMPLETE,
        () => textResponse('current', 'Current')
      );
      await expect(first.messaging.send('ignored')).resolves.toBeUndefined();
      await expect(
        first.updateConfig({ namespace: 'owner-unclaimed', isReadonly: false })
      ).resolves.toBeUndefined();
      await expect(current.messaging.send('still readonly')).rejects.toThrow(
        'read only mode'
      );
      await expect(scope.create({ namespace })).rejects.toThrow(
        'already running'
      );
      const unused = await scope.create({ namespace: 'owner-unclaimed' });
      expect(unused.state.get().messages).toEqual([]);
      const lateUnsubscribe = first.state.subscribe(() => {
        seen.push('late state');
      });
      try {
        let currentSends = 0;
        await current.updateConfig({
          namespace,
          messaging: {
            skipWelcome: true,
            customSendMessage: () => {
              currentSends += 1;
            },
          },
        });
        await current.messaging.send('current send');
        expect(currentSends).toBe(1);
        await current.messaging.upsertMessage(
          'later',
          MessageState.COMPLETE,
          () => textResponse('later', 'Later')
        );
        await expect(
          first.messaging.addFile(new File(['owned'], 'owned.txt'))
        ).rejects.toThrow('This chat handle was released');
        expect(first.messaging.removeFile('absent')).toBeUndefined();
        expect(first.state.get()).toBe(frozen);
        expect(current.state.get().messages.map(({ id }) => id)).toEqual(
          expect.arrayContaining(['current', 'later'])
        );
        expect(seen).toEqual([]);
        expect(selected).toEqual([]);
      } finally {
        lateUnsubscribe();
      }
    } finally {
      unsubscribe();
      unselect();
      first.off(original);
    }
  });

  it.each([true, false])(
    'destroys joined=%s before clearing SDK state',
    async (joined) => {
      const namespace = `owner-destroy-agent-${joined}`;
      const releaseEnd = gate();
      const desk = deskIntegration(releaseEnd.promise);
      const cleared = gate();
      const saved: Connection[] = [];
      let clearArmed = false;
      const notifications: string[] = [];
      const events: string[] = [];
      const endEvents: BusEventHumanAgentEndChat[] = [];
      const handle = await scope.create({
        namespace,
        serviceDeskFactory: desk.factory,
        humanAgentState: {
          onStateChange: (state) => {
            saved.push(state);
            if (clearArmed && !state.isConnected && !state.isSuspended) {
              cleared.resolve();
            }
          },
        },
      });
      let unsubscribe = (): void => undefined;
      const preEnd: ChatSDKHandlers = {
        type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
        handler: (event: BusEventHumanAgentPreEndChat) => {
          events.push('pre-end');
          event.cancel = true;
          event.cancelEndChat = true;
          event.preEndChatPayload = 'owned payload';
        },
      };
      const ended: ChatSDKHandlers = {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        handler: (event: BusEventHumanAgentEndChat) => {
          events.push('end');
          endEvents.push(event);
        },
      };
      handle.on([preEnd, ended]);
      let next: Promise<ChatSDKHandle>;
      let booted = false;
      try {
        await handle.serviceDesk.startConversation();
        if (joined) {
          await desk.callback.agentJoined({
            id: 'owned-agent',
            nickname: 'Ada',
            user_type: UserType.HUMAN,
          });
        }
        expect(handle.state.get().humanAgent.isConnected).toBe(joined);
        expect(handle.state.get().humanAgent.isConnecting).toBe(!joined);
        unsubscribe = handle.state.subscribe(() => {
          notifications.push('state');
        });
        desk.callback.updatePersistedState({ ticket: 'owned ticket' });
        expect(saved[saved.length - 1].serviceDeskState).toEqual({
          ticket: 'owned ticket',
        });
        expect(notifications).toContain('state');
        const frozen = handle.state.get();
        saved.length = 0;
        notifications.length = 0;
        clearArmed = true;
        handle.destroy();
        await bounded(desk.entered, 'Destroy endChat entry');
        expect(desk.endCalls).toEqual([
          {
            endedByHumanAgent: false,
            preEndChatPayload: joined ? 'owned payload' : undefined,
          },
        ]);
        next = scope.create({
          namespace,
          messaging: {
            skipWelcome: true,
            customLoadHistory: async () => {
              booted = true;
              return [];
            },
          },
        });
        void next.catch((): void => undefined);
        await nextTurn();
        expect(booted).toBe(false);
        expect(saved).toEqual([]);
        releaseEnd.resolve();
        await bounded(cleared.promise, 'SDK persistence clear');
        const fresh = await bounded(next, 'Create after agent end');
        expect(booted).toBe(true);
        expect(fresh.state.get().messages).toEqual([]);
        expect(events).toEqual(joined ? ['pre-end', 'end'] : ['end']);
        expect(endEvents).toEqual([
          expect.objectContaining({
            endedByHumanAgent: false,
            requestCancelled: !joined,
          }),
        ]);
        expect(saved).toHaveLength(1);
        expect(saved[0]).toEqual({
          isConnected: false,
          isSuspended: false,
          responseUserProfile: null,
          responseUserProfiles: {},
        });
        expect(notifications).toEqual([]);
        expect(handle.state.get()).toBe(frozen);
      } finally {
        releaseEnd.resolve();
        handle.destroy();
        await nextTurn();
        if (desk.endCalls.length) {
          await bounded(desk.returned, 'Owned end cleanup');
        }
        if (next) {
          await bounded(Promise.allSettled([next]), 'Next create cleanup');
        }
        unsubscribe();
        handle.off([preEnd, ended]);
      }
    }
  );

  it('aborts work before a bounded slow destroy', async () => {
    const namespace = 'owner-slow-destroy';
    const desk = deskIntegration();
    const transportEntered = gate();
    const finishTransport = gate();
    const preEndEntered = gate();
    const finishPreEnd = gate();
    let signal: AbortSignal;
    let transportWork: Promise<void>;
    let preEndWork: Promise<void>;
    const transport: Transport = (_request, options) => {
      signal = options.signal;
      transportEntered.resolve();
      transportWork = finishTransport.promise.then((): void => undefined);
      return transportWork;
    };
    const handle = await scope.create({
      namespace,
      serviceDeskFactory: desk.factory,
      messaging: { skipWelcome: true, customSendMessage: transport },
    });
    await desk.connect(handle);
    expect(handle.state.get().humanAgent.isConnected).toBe(true);
    const sending = handle.messaging.send('owned request');
    void sending.catch((): void => undefined);
    const preEnd: ChatSDKHandlers = {
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: () => {
        preEndEntered.resolve();
        preEndWork = finishPreEnd.promise.then((): void => undefined);
        return preEndWork;
      },
    };
    handle.on(preEnd);
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      await bounded(transportEntered.promise, 'Transport entry');
      expect(signal.aborted).toBe(false);
      controlTimeouts();
      handle.destroy();
      await bounded(preEndEntered.promise, 'Pre-end entry');
      expect(signal.aborted).toBe(true);
      expect(desk.endCalls).toEqual([]);
      await vi.advanceTimersByTimeAsync(4999);
      expect(desk.endCalls).toEqual([]);
      await vi.advanceTimersByTimeAsync(1);
      await bounded(desk.returned, 'Bounded desk end');
      expect(desk.endCalls).toHaveLength(1);
      const fresh = await bounded(
        scope.create({ namespace }),
        'Create after bounded end'
      );
      expect(fresh.state.get().messages).toEqual([]);
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("didn't settle within 5 seconds"),
        expect.anything()
      );
    } finally {
      finishPreEnd.resolve();
      finishTransport.resolve();
      await bounded(
        Promise.allSettled([sending, transportWork, preEndWork]),
        'Owned slow work cleanup'
      );
      handle.off(preEnd);
      logged.mockRestore();
    }
  });

  it.each([false, true])(
    'joins a running end with cancelled=%s',
    async (cancelFirst) => {
      const namespace = `owner-running-end-${cancelFirst}`;
      const desk = deskIntegration();
      const entered = gate();
      const release = gate();
      const handle = await scope.create({
        namespace,
        serviceDeskFactory: desk.factory,
      });
      await desk.connect(handle);
      expect(handle.state.get().humanAgent.isConnected).toBe(true);
      let calls = 0;
      const events: string[] = [];
      const preEnd: ChatSDKHandlers = {
        type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
        handler: async (event: BusEventHumanAgentPreEndChat) => {
          calls += 1;
          if (calls === 1) {
            entered.resolve();
            await release.promise;
            event.cancel = cancelFirst;
          }
        },
      };
      const ended: ChatSDKHandlers = {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        handler: () => {
          events.push('end');
        },
      };
      handle.on([preEnd, ended]);
      const ending = handle.serviceDesk.endConversation();
      void ending.catch((): void => undefined);
      try {
        await bounded(entered.promise, 'Running end entry');
        handle.destroy();
        expect(desk.endCalls).toEqual([]);
        release.resolve();
        await bounded(ending, 'Original end');
        await bounded(desk.returned, 'Destroy end');
        const fresh = await bounded(
          scope.create({ namespace }),
          'Create after joined end'
        );
        expect(fresh.state.get().messages).toEqual([]);
        expect(calls).toBe(cancelFirst ? 2 : 1);
        expect(desk.endCalls).toHaveLength(1);
        expect(events).toEqual(['end']);
      } finally {
        release.resolve();
        await bounded(Promise.allSettled([ending]), 'Owned end cleanup');
        handle.off([preEnd, ended]);
      }
    }
  );

  it('expires an SDK connection without ending it or reporting a cleared saved value', async () => {
    const namespace = 'owner-expiry-connection';
    const desk = deskIntegration();
    const saved: Connection[] = [];
    const first = await scope.create({
      namespace,
      lifecycle: { releaseGraceMs: 100 },
      serviceDeskFactory: desk.factory,
      humanAgentState: {
        onStateChange: (state) => {
          saved.push(state);
        },
      },
    });
    await desk.connect(first);
    expect(saved[saved.length - 1].isConnected).toBe(true);
    await first.serviceDesk.endConversation();
    expect(saved[saved.length - 1].isConnected).toBe(false);
    expect(desk.endCalls).toHaveLength(1);
    await desk.connect(first);
    const connected = saved[saved.length - 1];
    expect(connected.isConnected).toBe(true);
    saved.length = 0;
    desk.endCalls.length = 0;
    controlTimeouts();
    first.release();
    await vi.advanceTimersByTimeAsync(100);
    await desk.callback.sendMessageToUser(
      textResponse('late-agent', 'Late agent')
    );
    const next = await bounded(
      scope.create({ namespace }),
      'Create after expiry'
    );
    expect(next.state.get().messages).toEqual([]);
    expect(next.state.get().humanAgent.isConnected).toBe(false);
    expect(saved).toEqual([]);
    expect(desk.endCalls).toEqual([]);
    expect(connected.isConnected).toBe(true);
    await next.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
      textResponse('fresh', 'Fresh')
    );
    expect(next.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
  });

  it('waits for prior destination A after moved B finishes its own destroy', async () => {
    const holdA = gate();
    const holdB = gate();
    const clearedB = gate();
    const deskA = deskIntegration(holdA.promise);
    const deskB = deskIntegration(holdB.promise);
    let a: ChatSDKHandle;
    let b: ChatSDKHandle;
    let next: Promise<ChatSDKHandle>;
    let booted = false;
    try {
      a = await scope.create({
        namespace: 'owner-joined-destination',
        serviceDeskFactory: deskA.factory,
      });
      b = await scope.create({
        namespace: 'owner-joined-source',
        serviceDeskFactory: deskB.factory,
      });
      await deskA.connect(a);
      await deskB.connect(b);
      expect(a.state.get().humanAgent.isConnected).toBe(true);
      expect(b.state.get().humanAgent.isConnected).toBe(true);
      a.destroy();
      await bounded(deskA.entered, 'Prior A end entry');
      await b.updateConfig({
        namespace: 'owner-joined-destination',
        messaging: { skipWelcome: true },
        serviceDeskFactory: deskB.factory,
        humanAgentState: {
          onStateChange: (state) => {
            if (!state.isConnected) {
              clearedB.resolve();
            }
          },
        },
      });
      b.destroy();
      await bounded(deskB.entered, 'Moved B end entry');
      next = scope.create({
        namespace: 'owner-joined-destination',
        messaging: {
          skipWelcome: true,
          customLoadHistory: async () => {
            booted = true;
            return [];
          },
        },
      });
      void next.catch((): void => undefined);
      holdB.resolve();
      await bounded(deskB.returned, 'Moved B owned end return');
      await bounded(clearedB.promise, 'Moved B saved-state clear');
      await nextTurn();
      // B has completed public end and final persistence; A remains held.
      expect(deskB.endCalls).toHaveLength(1);
      expect(booted).toBe(false);
      holdA.resolve();
      await bounded(deskA.returned, 'Prior A owned end return');
      const fresh = await bounded(next, 'Create after both ends');
      expect(booted).toBe(true);
      expect(fresh.state.get().messages).toEqual([]);
      await fresh.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
        textResponse('fresh', 'Fresh')
      );
      expect(fresh.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
    } finally {
      holdB.resolve();
      holdA.resolve();
      a?.destroy();
      b?.destroy();
      await nextTurn();
      await bounded(
        Promise.allSettled([
          ...(deskA.endCalls.length ? [deskA.returned] : []),
          ...(deskB.endCalls.length ? [deskB.returned] : []),
        ]),
        'Both owned end cleanups'
      );
      if (next) {
        await bounded(Promise.allSettled([next]), 'Joined create cleanup');
      }
    }
  });
});

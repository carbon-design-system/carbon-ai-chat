/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKHandle } from '../index';
import {
  ScreenShareState,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import { UserType } from '../../types/messaging/Messages';
import { withSDK } from './helpers/publicContract';

function gate<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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

function integration() {
  let callback: ServiceDeskCallback;
  let stops = 0;
  let ends = 0;
  const endEntered = gate<void>();
  const endOperations: Promise<void>[] = [];
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Screen-share contract desk',
      startChat: async () => undefined,
      endChat: () => {
        ends += 1;
        const operation = Promise.resolve();
        endOperations.push(operation);
        endEntered.resolve();
        return operation;
      },
      sendMessageToAgent: async () => undefined,
      screenShareStop: async () => {
        stops += 1;
      },
    };
    return desk;
  };
  return {
    factory,
    endEntered: endEntered.promise,
    endOperations,
    get callback() {
      return callback;
    },
    get stops() {
      return stops;
    },
    get ends() {
      return ends;
    },
  };
}

async function join(
  sdk: ChatSDKHandle,
  desk: ReturnType<typeof integration>
): Promise<void> {
  await sdk.serviceDesk.startConversation();
  await desk.callback.agentJoined({
    id: 'screen-agent',
    nickname: 'Screen helper',
    user_type: UserType.HUMAN,
  });
  expect(sdk.state.get().humanAgent.isConnected).toBe(true);
}

describe('SDK screen-share consent ownership', () => {
  it('declines a real desk request when a headless host has no consent hook', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        try {
          await join(sdk, desk);
          await expect(
            bounded(
              desk.callback.screenShareRequest(),
              'Default consent answer'
            )
          ).resolves.toBe(ScreenShareState.DECLINED);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('shares one accepted decision between waiting desk requests and stops the accepted share through public controls', async () => {
    const desk = integration();
    const entered = gate<void>();
    const answer = gate<ScreenShareState>();
    const signals: AbortSignal[] = [];
    await withSDK(
      async (sdk) => {
        let first: Promise<ScreenShareState>;
        let second: Promise<ScreenShareState>;
        try {
          await join(sdk, desk);
          first = desk.callback.screenShareRequest();
          await bounded(entered.promise, 'Host consent entry');
          second = desk.callback.screenShareRequest();
          answer.resolve(ScreenShareState.ACCEPTED);
          expect(
            await bounded(Promise.all([first, second]), 'Shared answer')
          ).toEqual([ScreenShareState.ACCEPTED, ScreenShareState.ACCEPTED]);
          expect(signals).toHaveLength(1);
          expect(signals[0].aborted).toBe(false);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(true);
          await sdk.serviceDesk.stopScreenShare();
          expect(desk.stops).toBe(1);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          await expect(desk.callback.screenShareRequest()).resolves.toBe(
            ScreenShareState.ACCEPTED
          );
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(true);
          await desk.callback.screenShareEnded();
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          expect(desk.stops).toBe(1);
        } finally {
          answer.resolve(ScreenShareState.DECLINED);
          await sdk.serviceDesk.endConversation();
          await bounded(Promise.allSettled([first, second]), 'Consent cleanup');
        }
      },
      () => undefined,
      {
        serviceDeskFactory: desk.factory,
        serviceDesk: {
          onScreenShareRequest: ({ signal }) => {
            signals.push(signal);
            entered.resolve();
            return answer.promise;
          },
        },
      }
    );
  });

  it('ignores an ended request late answer while a newer host decision remains actionable', async () => {
    const desk = integration();
    const entered = [gate<void>(), gate<void>()];
    const answers = [gate<ScreenShareState>(), gate<ScreenShareState>()];
    const signals: AbortSignal[] = [];
    await withSDK(
      async (sdk) => {
        const requests: Promise<ScreenShareState>[] = [];
        try {
          await join(sdk, desk);
          requests.push(desk.callback.screenShareRequest());
          await bounded(entered[0].promise, 'First consent entry');
          await desk.callback.screenShareEnded();
          expect(signals[0].aborted).toBe(true);
          await expect(requests[0]).resolves.toBe(ScreenShareState.CANCELLED);
          requests.push(desk.callback.screenShareRequest());
          await bounded(entered[1].promise, 'New consent entry');
          answers[0].resolve(ScreenShareState.ACCEPTED);
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          expect(signals[1].aborted).toBe(false);
          answers[1].resolve(ScreenShareState.DECLINED);
          await expect(requests[1]).resolves.toBe(ScreenShareState.DECLINED);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          expect(signals).toHaveLength(2);
        } finally {
          answers.forEach((held) => held.resolve(ScreenShareState.DECLINED));
          await sdk.serviceDesk.endConversation();
          await bounded(Promise.allSettled(requests), 'Stale consent cleanup');
        }
      },
      () => undefined,
      {
        serviceDeskFactory: desk.factory,
        serviceDesk: {
          onScreenShareRequest: ({ signal }) => {
            const index = signals.length;
            signals.push(signal);
            entered[index].resolve();
            return answers[index].promise;
          },
        },
      }
    );
  });

  it('declines a rejected host consent dialog and allows the next valid decision', async () => {
    const desk = integration();
    let decisions = 0;
    const unavailable = new Error('Host consent dialog closed unexpectedly');
    await withSDK(
      async (sdk) => {
        try {
          await join(sdk, desk);
          await expect(
            bounded(
              desk.callback.screenShareRequest(),
              'Failed dialog fallback'
            )
          ).resolves.toBe(ScreenShareState.DECLINED);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          await expect(
            bounded(
              desk.callback.screenShareRequest(),
              'Recovered host consent'
            )
          ).resolves.toBe(ScreenShareState.ACCEPTED);
          expect(decisions).toBe(2);
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(true);
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      {
        serviceDeskFactory: desk.factory,
        serviceDesk: {
          onScreenShareRequest: async () => {
            decisions += 1;
            if (decisions === 1) {
              throw unavailable;
            }
            return ScreenShareState.ACCEPTED;
          },
        },
      }
    );
  });

  it('ends pending consent with its agent conversation and permits a fresh accepted share', async () => {
    const desk = integration();
    const entered = gate<void>();
    const oldAnswer = gate<ScreenShareState>();
    const signals: AbortSignal[] = [];
    await withSDK(
      async (sdk) => {
        let old: Promise<ScreenShareState>;
        try {
          await join(sdk, desk);
          old = desk.callback.screenShareRequest();
          await bounded(entered.promise, 'Conversation-owned consent');
          await sdk.serviceDesk.endConversation();
          await expect(old).resolves.toBe(ScreenShareState.CANCELLED);
          expect(signals[0].aborted).toBe(true);
          expect(sdk.state.get().humanAgent.isConnected).toBe(false);
          oldAnswer.resolve(ScreenShareState.ACCEPTED);
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          await join(sdk, desk);
          await expect(desk.callback.screenShareRequest()).resolves.toBe(
            ScreenShareState.ACCEPTED
          );
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(true);
          await sdk.serviceDesk.endConversation();
          expect(sdk.state.get().humanAgent.isScreenSharing).toBe(false);
          expect(desk.ends).toBe(2);
        } finally {
          oldAnswer.resolve(ScreenShareState.DECLINED);
          await sdk.serviceDesk.endConversation();
          await bounded(Promise.allSettled([old]), 'Ended consent cleanup');
        }
      },
      () => undefined,
      {
        serviceDeskFactory: desk.factory,
        serviceDesk: {
          onScreenShareRequest: ({ signal }) => {
            signals.push(signal);
            entered.resolve();
            return signals.length === 1
              ? oldAnswer.promise
              : Promise.resolve(ScreenShareState.ACCEPTED);
          },
        },
      }
    );
  });

  it('cancels entered host consent on actual SDK removal and completes the desk request', async () => {
    const desk = integration();
    const entered = gate<void>();
    const answer = gate<ScreenShareState>();
    let signal: AbortSignal;
    await withSDK(
      async (sdk) => {
        let request: Promise<ScreenShareState>;
        try {
          await join(sdk, desk);
          request = desk.callback.screenShareRequest();
          await bounded(entered.promise, 'Removable consent entry');
          expect(signal.aborted).toBe(false);
          sdk.destroy();
          expect(signal.aborted).toBe(true);
          await bounded(desk.endEntered, 'Removed desk end entry');
          await Promise.all(desk.endOperations);
          await expect(bounded(request, 'Removed desk consent')).resolves.toBe(
            ScreenShareState.CANCELLED
          );
        } finally {
          answer.resolve(ScreenShareState.DECLINED);
          await answer.promise;
          await new Promise<void>((resolve) => setImmediate(resolve));
          await bounded(
            Promise.allSettled([request]),
            'Removed consent cleanup'
          );
        }
      },
      () => undefined,
      {
        serviceDeskFactory: desk.factory,
        serviceDesk: {
          onScreenShareRequest: ({ signal: ownedSignal }) => {
            signal = ownedSignal;
            entered.resolve();
            return answer.promise;
          },
        },
      }
    );
  });
});

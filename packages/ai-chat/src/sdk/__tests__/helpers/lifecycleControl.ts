/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createChatSDK,
  type ChatSDKConfig,
  type ChatSDKHandle,
} from '../../index';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../types/config/ServiceDeskConfig';
import { UserType } from '../../../types/messaging/Messages';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

export function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export function gate() {
  const work = deferred<void>();
  return { promise: work.promise, resolve: () => work.resolve(undefined) };
}

export async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          2000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

export async function nextTurn() {
  // Drain the finite promise chain after an owned callback actually returns.
  await new Promise<void>((resolve) => setImmediate(resolve));
}

export function controlTimeouts() {
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setTimeout',
      'clearTimeout',
    ],
  });
}

export function sdkScope() {
  const handles: ChatSDKHandle[] = [];
  return {
    create: async (config: ChatSDKConfig) => {
      const handle = await createChatSDK({
        messaging: { skipWelcome: true, customSendMessage: () => undefined },
        ...config,
      });
      handles.push(handle);
      return handle;
    },
    destroy: () => handles.splice(0).forEach((handle) => handle.destroy()),
  };
}

export function deskIntegration(endWork: Promise<void> = Promise.resolve()) {
  let callback: ServiceDeskCallback;
  const entered = gate();
  const returned = gate();
  const endCalls: Parameters<ServiceDesk['endChat']>[0][] = [];
  const desk: ServiceDesk = {
    getName: () => 'Lifecycle owner desk',
    startChat: async () => undefined,
    endChat: async (parameters) => {
      endCalls.push(parameters);
      entered.resolve();
      await endWork;
      returned.resolve();
    },
    sendMessageToAgent: async () => undefined,
  };
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    return desk;
  };
  return {
    factory,
    desk,
    entered: entered.promise,
    returned: returned.promise,
    endCalls,
    get callback() {
      return callback;
    },
    connect: async (handle: ChatSDKHandle) => {
      await handle.serviceDesk.startConversation();
      await callback.agentJoined({
        id: 'lifecycle-agent',
        nickname: 'Ada',
        user_type: UserType.HUMAN,
      });
    },
  };
}

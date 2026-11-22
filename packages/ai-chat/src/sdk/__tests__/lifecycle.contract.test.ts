/**
 * @vitest-environment node
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["vitest-environment"] }] */

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
} from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import { textResponse } from './helpers/publicContract';

type Transport = NonNullable<
  NonNullable<ChatSDKConfig['messaging']>['customSendMessage']
>;

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);
const handles: ChatSDKHandle[] = [];

async function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      operation,
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

async function create(config: ChatSDKConfig): Promise<ChatSDKHandle> {
  const handle = await createChatSDK({
    messaging: { skipWelcome: true },
    ...config,
  });
  handles.push(handle);
  return handle;
}

function transportGate() {
  let finish: () => void;
  let enter: () => void;
  let signal: AbortSignal;
  const work = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const customSendMessage: Transport = async (_request, options) => {
    signal = options.signal;
    enter();
    await work;
  };
  return {
    customSendMessage,
    entered,
    finish,
    get signal() {
      return signal;
    },
  };
}

function controlTimeouts() {
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

afterEach(() => {
  handles.splice(0).forEach((handle) => handle.destroy());
  vi.useRealTimers();
});

describe('SDK public lifecycle', () => {
  it('keeps owned work until the default 3000 ms release deadline, then starts fresh', async () => {
    const gate = transportGate();
    const first = await create({
      namespace: 'lifecycle-default',
      messaging: {
        skipWelcome: true,
        customSendMessage: gate.customSendMessage,
      },
    });
    const sending = first.messaging.send('owned request');
    void sending.catch((): void => undefined);
    try {
      await bounded(gate.entered, 'Transport entry');
      controlTimeouts();
      first.release();
      await vi.advanceTimersByTimeAsync(2999);
      expect(gate.signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(gate.signal.aborted).toBe(true);
      gate.finish();
      await bounded(sending, 'Owned send');
      const next = await bounded(
        create({ namespace: 'lifecycle-default' }),
        'Next create'
      );
      expect(next.state.get().messages).toEqual([]);
    } finally {
      gate.finish();
      await bounded(sending, 'Owned send cleanup');
    }
  });

  it('gives an adopted handle its own full window and ignores stale or repeated releases', async () => {
    const first = await create({ namespace: 'lifecycle-renew' });
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    controlTimeouts();
    first.release();
    await vi.advanceTimersByTimeAsync(1000);
    const gate = transportGate();
    const current = await create({
      namespace: 'lifecycle-renew',
      messaging: {
        skipWelcome: true,
        customSendMessage: gate.customSendMessage,
      },
    });
    expect(current).not.toBe(first);
    expect(current.state.get().messages.map(({ id }) => id)).toEqual(['kept']);
    const sending = current.messaging.send('current request');
    void sending.catch((): void => undefined);
    try {
      await bounded(gate.entered, 'Transport entry');
      first.release();
      await vi.advanceTimersByTimeAsync(2500);
      expect(gate.signal.aborted).toBe(false);
      current.release();
      await vi.advanceTimersByTimeAsync(2999);
      expect(gate.signal.aborted).toBe(false);
      current.release();
      await vi.advanceTimersByTimeAsync(1);
      expect(gate.signal.aborted).toBe(true);
      gate.finish();
      await bounded(sending, 'Owned send');
    } finally {
      gate.finish();
      await bounded(sending, 'Owned send cleanup');
    }
  });

  it('reads the copied lifecycle config at release after updateConfig resolves', async () => {
    const gate = transportGate();
    const first = await create({
      namespace: 'lifecycle-updated',
      lifecycle: { releaseGraceMs: 25 },
    });
    const nextConfig: ChatSDKConfig = {
      namespace: 'lifecycle-updated',
      lifecycle: { releaseGraceMs: 500 },
      messaging: {
        skipWelcome: true,
        customSendMessage: gate.customSendMessage,
      },
    };
    await first.updateConfig(nextConfig);
    nextConfig.lifecycle.releaseGraceMs = 1;
    const sending = first.messaging.send('updated request');
    void sending.catch((): void => undefined);
    try {
      await bounded(gate.entered, 'Transport entry');
      controlTimeouts();
      first.release();
      await vi.advanceTimersByTimeAsync(499);
      expect(gate.signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(gate.signal.aborted).toBe(true);
      gate.finish();
      await bounded(sending, 'Owned send');
    } finally {
      gate.finish();
      await bounded(sending, 'Owned send cleanup');
    }
  });

  it('uses the adopting config for its next release deadline', async () => {
    const first = await create({
      namespace: 'lifecycle-adopted',
      lifecycle: { releaseGraceMs: 5000 },
    });
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    controlTimeouts();
    first.release();
    const gate = transportGate();
    const current = await create({
      namespace: 'lifecycle-adopted',
      lifecycle: { releaseGraceMs: 100 },
      messaging: {
        skipWelcome: true,
        customSendMessage: gate.customSendMessage,
      },
    });
    expect(current.state.get().messages.map(({ id }) => id)).toEqual(['kept']);
    const sending = current.messaging.send('adopted request');
    void sending.catch((): void => undefined);
    try {
      await bounded(gate.entered, 'Transport entry');
      current.release();
      await vi.advanceTimersByTimeAsync(99);
      expect(gate.signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(gate.signal.aborted).toBe(true);
      gate.finish();
      await bounded(sending, 'Owned send');
    } finally {
      gate.finish();
      await bounded(sending, 'Owned send cleanup');
    }
  });

  it('copies the exact boot argument before caller root and nested mutations', async () => {
    const calls: string[] = [];
    const config: ChatSDKConfig = {
      namespace: 'lifecycle-copy-boot',
      isReadonly: false,
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => {
          calls.push('original');
        },
      },
    };
    const handle = await createChatSDK(config);
    handles.push(handle);
    config.isReadonly = true;
    config.messaging.customSendMessage = async () => {
      calls.push('caller mutation');
    };
    await handle.messaging.send('copied boot argument');
    expect(calls).toEqual(['original']);
  });

  it('replaces readonly on adoption and copies the adopting transport callback', async () => {
    const calls: string[] = [];
    const first = await create({
      namespace: 'lifecycle-copy-adopt',
      isReadonly: true,
    });
    await expect(first.messaging.send('blocked')).rejects.toThrow(
      'read only mode'
    );
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    first.release();
    const adopting: ChatSDKConfig = {
      namespace: 'lifecycle-copy-adopt',
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => {
          calls.push('adopted');
        },
      },
    };
    const current = await createChatSDK(adopting);
    handles.push(current);
    expect(current.state.get().messages.map(({ id }) => id)).toEqual(['kept']);
    adopting.messaging.customSendMessage = async () => {
      calls.push('caller mutation');
    };
    await current.messaging.send('adopted request');
    expect(calls).toEqual(['adopted']);
  });

  it('resets readonly on update and copies the replacement transport callback', async () => {
    const calls: string[] = [];
    const handle = await create({
      namespace: 'lifecycle-copy-update',
      isReadonly: true,
    });
    await expect(handle.messaging.send('blocked')).rejects.toThrow(
      'read only mode'
    );
    const updated: ChatSDKConfig = {
      namespace: 'lifecycle-copy-update',
      messaging: {
        skipWelcome: true,
        customSendMessage: async () => {
          calls.push('updated');
        },
      },
    };
    await expect(handle.updateConfig(updated)).resolves.toBeUndefined();
    updated.messaging.customSendMessage = async () => {
      calls.push('caller mutation');
    };
    await handle.messaging.send('updated request');
    expect(calls).toEqual(['updated']);
  });

  it('removes stale handlers from an adopted chat and lets an old handle destroy its successor', async () => {
    const first = await create({ namespace: 'lifecycle-stale' });
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    const seen: string[] = [];
    const handler = {
      type: BusEventType.SEND as const,
      handler: () => {
        seen.push('old');
      },
    };
    first.on(handler);
    first.release();
    const current = await create({
      namespace: 'lifecycle-stale',
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    expect(current.state.get().messages.map(({ id }) => id)).toEqual(['kept']);
    first.off(handler);
    await current.messaging.send('successor request');
    expect(seen).toEqual([]);
    const frozen = current.state.get();
    const changes: unknown[] = [];
    const unsubscribe = current.state.subscribe(() => {
      changes.push(current.state.get());
    });
    try {
      first.destroy();
      await expect(current.messaging.send('after destruction')).rejects.toThrow(
        'Another handle destroyed this chat'
      );
      await expect(current.messaging.restartConversation()).rejects.toThrow(
        'Another handle destroyed this chat'
      );
      await expect(current.serviceDesk.endConversation()).rejects.toThrow(
        'Another handle destroyed this chat'
      );
      await expect(
        current.updateConfig({ namespace: 'peer-unused' })
      ).rejects.toThrow('Another handle destroyed this chat');
      expect(current.messaging.clearError()).toBeUndefined();
      expect(current.messaging.removeFile('absent')).toBeUndefined();
      const next = await bounded(
        create({ namespace: 'lifecycle-stale' }),
        'Next create'
      );
      await next.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
        textResponse('fresh', 'Fresh')
      );
      expect(next.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
      expect(current.state.get()).toBe(frozen);
      expect(changes).toEqual([]);
      next.destroy();
      await expect(
        next.updateConfig({ namespace: 'unused' })
      ).resolves.toBeUndefined();
    } finally {
      unsubscribe();
      first.off(handler);
    }
  });
});

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

import { createChatSDK } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import type { ServiceDesk } from '../../types/config/ServiceDeskConfig';
import type { HistoryItem } from '../../types/messaging/History';
import { textResponse } from './helpers/publicContract';
import {
  bounded,
  controlTimeouts,
  deferred,
  deskIntegration,
  gate,
  sdkScope,
} from './helpers/lifecycleControl';

const scope = sdkScope();

afterEach(() => {
  scope.destroy();
  vi.useRealTimers();
});

describe('SDK namespace lifecycle', () => {
  it('reports a failed boot, releases its namespace, and starts a usable fresh chat', async () => {
    const history = deferred<HistoryItem[]>();
    const entered = gate();
    const failure = new Error('Owned history failure');
    const reported: unknown[] = [];
    const booting = createChatSDK({
      namespace: 'owner-boot-failure',
      onError: (error) => reported.push(error.otherData),
      messaging: {
        skipWelcome: true,
        customLoadHistory: () => {
          entered.resolve();
          return history.promise;
        },
      },
    });
    const failed = expect(booting).rejects.toBe(failure);
    try {
      await bounded(entered.promise, 'History entry');
      await expect(
        scope.create({ namespace: 'owner-boot-failure' })
      ).rejects.toThrow(
        'A chat with the namespace "owner-boot-failure" is already running'
      );
      history.reject(failure);
      await bounded(failed, 'Failed create');
      expect(reported).toContain(failure);
      const next = await bounded(
        scope.create({ namespace: 'owner-boot-failure' }),
        'Recovery create'
      );
      expect(next.state.get().messages).toEqual([]);
      await next.messaging.upsertMessage(
        'recovered',
        MessageState.COMPLETE,
        () => textResponse('recovered', 'Recovered')
      );
      expect(next.state.get().messages.map(({ id }) => id)).toEqual([
        'recovered',
      ]);
    } finally {
      history.reject(failure);
      await bounded(failed, 'Boot cleanup');
    }
  });

  it('moves to a free namespace and preserves config after collision', async () => {
    const occupied = await scope.create({ namespace: 'owner-taken' });
    const unnamed = await scope.create({});
    const current = await scope.create({
      namespace: 'owner-mine',
      isReadonly: true,
    });
    await expect(current.messaging.send('blocked before move')).rejects.toThrow(
      'read only mode'
    );
    await expect(
      current.updateConfig({ namespace: 'owner-taken', isReadonly: false })
    ).rejects.toThrow(
      'A chat with the namespace "owner-taken" is already running'
    );
    await expect(current.messaging.send('still blocked')).rejects.toThrow(
      'read only mode'
    );
    await expect(
      current.updateConfig({ messaging: { skipWelcome: true } })
    ).rejects.toThrow('A chat with no namespace is already running');
    await expect(scope.create({ namespace: 'owner-mine' })).rejects.toThrow(
      'already running'
    );
    await current.updateConfig({
      namespace: 'owner-moved',
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    await current.messaging.send('moved request');
    expect(current.state.get().messages).toHaveLength(1);
    await expect(scope.create({ namespace: 'owner-moved' })).rejects.toThrow(
      'already running'
    );
    const fresh = await scope.create({ namespace: 'owner-mine' });
    expect(fresh.state.get().messages).toEqual([]);
    expect(occupied.state.get().messages).toEqual([]);
    expect(unnamed.state.get().messages).toEqual([]);
  });

  it('recovers a failed adoption with the same transcript', async () => {
    const first = await scope.create({ namespace: 'owner-adopt-retry' });
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    first.release();
    const failure = new Error('Owned adoption failure');
    await expect(
      createChatSDK({
        namespace: 'owner-adopt-retry',
        messaging: { skipWelcome: true },
        serviceDeskFactory: async () => {
          throw failure;
        },
      })
    ).rejects.toBe(failure);
    const current = await scope.create({ namespace: 'owner-adopt-retry' });
    expect(current.state.get().messages.map(({ id }) => id)).toEqual(['kept']);
    await current.messaging.upsertMessage('next', MessageState.COMPLETE, () =>
      textResponse('next', 'Next')
    );
    expect(current.state.get().messages.map(({ id }) => id)).toEqual([
      'kept',
      'next',
    ]);
  });

  it('expires a failed adoption left alone', async () => {
    const first = await scope.create({ namespace: 'owner-adopt-expiry' });
    await first.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
      textResponse('kept', 'Kept')
    );
    first.release();
    controlTimeouts();
    await expect(
      createChatSDK({
        namespace: 'owner-adopt-expiry',
        lifecycle: { releaseGraceMs: 100 },
        messaging: { skipWelcome: true },
        serviceDeskFactory: async () => {
          throw new Error('Owned adoption failure');
        },
      })
    ).rejects.toThrow('Owned adoption failure');
    await vi.advanceTimersByTimeAsync(100);
    const next = await bounded(
      scope.create({ namespace: 'owner-adopt-expiry' }),
      'Post-expiry create'
    );
    expect(next.state.get().messages).toEqual([]);
    await next.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
      textResponse('fresh', 'Fresh')
    );
    expect(next.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
  });

  it('destroys a released chat while its next create is inside a held public factory', async () => {
    const desk = deskIntegration();
    const first = await scope.create({
      namespace: 'owner-destroy-adopting',
      serviceDeskFactory: desk.factory,
    });
    await first.messaging.upsertMessage('old', MessageState.COMPLETE, () =>
      textResponse('old', 'Old')
    );
    first.release();
    const entered = gate();
    const factory = deferred<ServiceDesk>();
    const adopting = createChatSDK({
      namespace: 'owner-destroy-adopting',
      messaging: { skipWelcome: true },
      serviceDeskFactory: () => {
        entered.resolve();
        return factory.promise;
      },
    });
    const rejected = expect(adopting).rejects.toThrow(
      'was destroyed while this one waited to reuse it'
    );
    try {
      await bounded(entered.promise, 'Adopting factory entry');
      first.destroy();
      // The real factory is still held; no new handle is exposed for adoption.
      const next = await bounded(
        scope.create({ namespace: 'owner-destroy-adopting' }),
        'Create after destroy'
      );
      expect(next.state.get().messages).toEqual([]);
      await next.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
        textResponse('fresh', 'Fresh')
      );
      factory.resolve(desk.desk);
      await bounded(rejected, 'Destroyed adoption');
      expect(next.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
    } finally {
      factory.resolve(desk.desk);
      await bounded(rejected, 'Adoption cleanup');
    }
  });
});

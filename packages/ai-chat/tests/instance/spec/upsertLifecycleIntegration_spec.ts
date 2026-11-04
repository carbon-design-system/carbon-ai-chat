/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import {
  MessageState,
  CancellationReason,
} from '../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

const response = (id: string): MessageResponse => ({
  id,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: id,
        streaming_metadata: { id: 'item', cancellable: true },
      },
    ],
  },
});

describe('upsert rendering and public-state integration', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('invalidates pending upserts before pre-restart without aborting the producer until afterward', async () => {
    let signal: AbortSignal;
    const config = createBaseConfig();
    config.messaging.customSendMessage = async (
      _request,
      options,
      instance
    ) => {
      signal = options.signal;
      await instance.messaging.upsertMessage(
        'stream',
        MessageState.STREAMING,
        () => response('stream')
      );
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    await instance.send('start');
    const updaterEntered = resolvablePromise();
    const releaseUpdater = resolvablePromise<MessageResponse>();
    const pending = instance.messaging.upsertMessage(
      'pending',
      MessageState.COMPLETE,
      () => {
        updaterEntered.doResolve();
        return releaseUpdater;
      }
    );
    await updaterEntered;
    const preEntered = resolvablePromise();
    const releasePre = resolvablePromise();
    instance.on({
      type: BusEventType.PRE_RESTART_CONVERSATION,
      handler: async () => {
        preEntered.doResolve();
        await releasePre;
      },
    });
    const restarting = serviceManager.actions.restartConversation({
      skipHydration: true,
    });
    await preEntered;
    const abortedDuringPre = signal.aborted;
    releaseUpdater.doResolve(response('pending'));
    await pending;
    const committedDuringPre = store.getState().allMessagesByID.pending;
    releasePre.doResolve();
    await restarting;
    expect(abortedDuringPre).toBe(false);
    expect(committedDuringPre).toBeUndefined();
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    expect(store.getState().allMessagesByID.pending).toBeUndefined();
  });

  it('reports ready when upstream Stop ends a standalone upsert stream', async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await instance.messaging.upsertMessage(
      'standalone',
      MessageState.STREAMING,
      () => response('standalone')
    );
    expect(instance.state.get().status).toBe('streaming');
    await serviceManager.messageService.cancelCurrentMessageRequest();
    expect(serviceManager.messageUpsertCoordinator.hasStreamingMessages()).toBe(
      false
    );
    expect(instance.state.get().status).toBe('ready');
  });

  it.each(['addMessage', 'removeMessages'])(
    'reports ready when %s ends a tracked upsert stream',
    async (operation) => {
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await instance.messaging.upsertMessage(
        'mixed',
        MessageState.STREAMING,
        () => response('mixed')
      );
      expect(instance.state.get().status).toBe('streaming');
      if (operation === 'addMessage') {
        await instance.messaging.addMessage(response('mixed'));
      } else {
        await serviceManager.receiveService.removeMessages(['mixed']);
      }
      expect(
        serviceManager.messageUpsertCoordinator.hasStreamingMessages()
      ).toBe(false);
      expect(instance.state.get().status).toBe('ready');
    }
  );

  it('keeps a pending send streaming after addMessage completes its upsert response', async () => {
    const completed = resolvablePromise();
    const releaseSend = resolvablePromise();
    const config = createBaseConfig();
    config.messaging.customSendMessage = async (
      _request,
      _options,
      instance
    ) => {
      await instance.messaging.upsertMessage(
        'pending-owner',
        MessageState.STREAMING,
        () => response('pending-owner')
      );
      await instance.messaging.addMessage(response('pending-owner'));
      completed.doResolve();
      await releaseSend;
    };
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const sending = instance.send('start');
    await completed;
    expect(serviceManager.messageUpsertCoordinator.hasStreamingMessages()).toBe(
      false
    );
    expect(instance.state.get().status).toBe('streaming');
    releaseSend.doResolve();
    await sending;
    expect(instance.state.get().status).toBe('ready');
  });

  it('accepts a captured frozen response as an updater result', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await instance.messaging.addMessage(response('frozen-result'));
    const frozen = store.getState().allMessagesByID[
      'frozen-result'
    ] as MessageResponse;
    expect(Object.isFrozen(frozen)).toBe(true);
    await expect(
      instance.messaging.upsertMessage(
        'frozen-result',
        MessageState.COMPLETE,
        () => frozen
      )
    ).resolves.toBeUndefined();
    await waitFor(() =>
      expect(store.getState().allMessagesByID['frozen-result']).toEqual(frozen)
    );
  });
});

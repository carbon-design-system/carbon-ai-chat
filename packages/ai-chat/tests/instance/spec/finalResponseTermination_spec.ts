/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { requestStopFromInput } from '../../../src/shared/services/assistantInputCommands';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import {
  CancellationReason,
  MessageState,
} from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

describe('termination after a final response releases the queue', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it.each([
    ['chunk', 'Stop'],
    ['chunk', 'restart'],
    ['upsert', 'Stop'],
    ['upsert', 'restart'],
  ] as const)(
    'preserves pending transport ownership when a chunk stream ends through %s before %s',
    async (delivery, termination) => {
      const releases = new Map(
        ['first', 'second', 'replacement', 'following'].map((text) => [
          text,
          resolvablePromise<void>(),
        ])
      );
      const signals = new Map<string, AbortSignal>();
      const started: string[] = [];
      const receiveEntered = resolvablePromise<void>();
      const releaseReceive = resolvablePromise<void>();
      const onError = jest.fn();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore({
          ...createBaseConfig(),
          onError,
          messaging: {
            skipWelcome: true,
            messageTimeoutSecs: 0,
            showStopButtonImmediately: true,
            customSendMessage: async (request, options): Promise<void> => {
              const text = request.input.text;
              started.push(text);
              signals.set(text, options.signal);
              await releases.get(text);
            },
          },
        });
      instance.on({
        type: BusEventType.RECEIVE,
        handler: async (): Promise<void> => {
          receiveEntered.doResolve();
          await releaseReceive;
        },
      });
      const stopEvent = jest.fn();
      instance.on({ type: BusEventType.STOP_STREAMING, handler: stopEvent });
      const response = (name: string) => ({
        id: `${name}-response`,
        output: {
          generic: [
            {
              streaming_metadata: { id: `${name}-item` },
              response_type: MessageResponseTypes.TEXT,
              text: `${name} response`,
            },
          ],
        },
      });
      const stream = async (name: string) => {
        // Both completion APIs can finish a stream that began with chunks.
        await instance.messaging.addMessageChunk({
          streaming_metadata: { response_id: `${name}-response` },
          partial_item: response(name).output.generic[0],
        });
      };
      const pending: Promise<unknown>[] = [];
      let firstSettled = false;
      const first = instance.send('first').then(() => {
        firstSettled = true;
      });
      pending.push(first);

      try {
        await waitFor(() => expect(started).toEqual(['first']));
        await stream('first');
        const second = instance.send('second');
        pending.push(second);
        await waitFor(() =>
          expect(
            serviceManager.messageCoordinator.getWaitingRequestCount()
          ).toBe(1)
        );

        const final =
          delivery === 'chunk'
            ? instance.messaging.addMessageChunk({
                final_response: response('first'),
              })
            : instance.messaging.upsertMessage(
                'first-response',
                MessageState.COMPLETE,
                () => response('first')
              );
        pending.push(final);
        await receiveEntered;
        expect(started).toEqual(['first']);
        expect(firstSettled).toBe(false);
        expect(serviceManager.messageCoordinator.getWaitingRequestCount()).toBe(
          1
        );

        releaseReceive.doResolve();
        await final;
        await waitFor(() => expect(started).toEqual(['first', 'second']));
        expect(firstSettled).toBe(false);
        expect(signals.get('first').aborted).toBe(false);
        expect(signals.get('second').aborted).toBe(false);
        await stream('second');

        const generation = serviceManager.messageCoordinator.currentGeneration;
        const markPending = jest.fn();
        if (termination === 'Stop') {
          await requestStopFromInput(serviceManager, markPending);
          expect(markPending).toHaveBeenCalledTimes(1);
          expect(stopEvent).toHaveBeenCalledTimes(1);
        } else {
          await instance.messaging.restartConversation();
          expect(stopEvent).not.toHaveBeenCalled();
        }
        await expect(second).resolves.toBeUndefined();
        expect(signals.get('second').aborted).toBe(true);
        expect(signals.get('second').reason).toBe(
          termination === 'Stop'
            ? CancellationReason.STOP_STREAMING
            : CancellationReason.CONVERSATION_RESTARTED
        );
        // Finalization already removed the first request's controller aliases.
        expect(signals.get('first').aborted).toBe(false);
        expect(firstSettled).toBe(false);
        expect(serviceManager.messageCoordinator.currentGeneration).toBe(
          generation + (termination === 'restart' ? 1 : 0)
        );

        const replacement = instance.send('replacement');
        pending.push(replacement);
        await waitFor(() =>
          expect(started).toEqual(['first', 'second', 'replacement'])
        );
        const following = instance.send('following');
        pending.push(following);
        await waitFor(() =>
          expect(
            serviceManager.messageCoordinator.getWaitingRequestCount()
          ).toBe(1)
        );
        const current = serviceManager.messageCoordinator.getCurrentRequest();
        const replacementGeneration =
          serviceManager.messageCoordinator.currentGeneration;
        // Stop leaves the first responded request active until its host returns.
        expect(instance.state.get().status).toBe(
          termination === 'Stop' ? 'streaming' : 'submitted'
        );

        releases.get('first').doResolve();
        releases.get('second').doResolve();
        await first;
        expect(firstSettled).toBe(true);
        expect(serviceManager.messageCoordinator.getCurrentRequest()).toBe(
          current
        );
        expect(serviceManager.messageCoordinator.currentGeneration).toBe(
          replacementGeneration
        );
        expect(serviceManager.messageCoordinator.getWaitingRequestCount()).toBe(
          1
        );
        expect(signals.get('replacement').aborted).toBe(false);
        expect(started).toEqual(['first', 'second', 'replacement']);
        expect(instance.state.get().status).toBe('submitted');

        releases.get('replacement').doResolve();
        await replacement;
        await waitFor(() =>
          expect(started).toEqual([
            'first',
            'second',
            'replacement',
            'following',
          ])
        );
        releases.get('following').doResolve();
        await following;
        expect(instance.state.get().status).toBe('ready');
        expect(onError).not.toHaveBeenCalled();
      } finally {
        releaseReceive.doResolve();
        releases.forEach((release) => release.doResolve());
        await Promise.allSettled(pending);
      }
    }
  );
});

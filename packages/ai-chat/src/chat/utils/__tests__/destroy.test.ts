/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { bootPrebuiltChat, mergePublicConfig } from '../chatBoot';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import actions from '../../../sdk/store/actions';
import { MessageState } from '../../../types/config/MessagingConfig';
import type { PublicConfig } from '../../../types/config/PublicConfig';
import type { ChatSDKInstance } from '../../../types/instance/ChatSDKInstance';
import {
  type MessageRequest,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';

/** Replies to every request through `upsertMessage`, as a host would. */
async function echo(
  request: MessageRequest,
  _options: unknown,
  instance: ChatSDKInstance
) {
  const id = `reply-${request.id}`;
  await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () => ({
    id,
    request_id: request.id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: 'ok' }],
    },
  }));
}

const managers: ServiceManager[] = [];

/** Boots a prebuilt chat with no view, shut down after the test. */
async function prebuilt(config: Partial<PublicConfig>) {
  const booted = await bootPrebuiltChat({
    publicConfig: mergePublicConfig({
      messaging: { skipWelcome: true, customSendMessage: echo },
      ...config,
    }),
  });
  managers.push(booted.serviceManager);
  return booted;
}

/** Lets a shutdown queued behind promise callbacks run, with timers fake. */
async function settle() {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(managers.splice(0).map((manager) => manager.shutdown()));
  vi.restoreAllMocks();
});

describe('a store listener that ends the chat (DEFERRED review)', () => {
  it.each([
    ['destroy()', 'destroy'],
    ['release() with no reuse', 'release'],
  ] as const)(
    '%s inside the first listener still runs the later ones once, and none after',
    async (_name, verb) => {
      const { handle, serviceManager, instance } = await prebuilt({});
      const second = vi.fn();
      const raw = vi.fn();
      let ended = false;
      instance.state.subscribe(() => {
        if (!ended) {
          ended = true;
          handle[verb]();
        }
      });
      instance.state.subscribe(second);
      // The store's own listeners, after the public state's.
      serviceManager.store.subscribe(raw);

      serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
      expect(ended).toBe(true);
      expect(second).toHaveBeenCalledTimes(1);
      expect(raw).toHaveBeenCalledTimes(1);

      await serviceManager.shutdown();
      serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(false)
      );
      await settle();
      expect(second).toHaveBeenCalledTimes(1);
      expect(raw).toHaveBeenCalledTimes(1);
    }
  );
});

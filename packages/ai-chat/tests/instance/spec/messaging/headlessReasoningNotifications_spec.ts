/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { MessageCoordinator } from '../../../../src/sdk/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../../src/sdk/services/ServiceManager';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import {
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../../src/chat/utils/chatBoot';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
  unmountKeepingServices,
} from '../../../test_helpers';
import { idleInstancePort } from '../../../services/helpers/viewBindings';

const response = (id: string, value: string): MessageResponse => ({
  id,
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Answer',
        streaming_metadata: { id: 'answer' },
      },
    ],
  },
  message_options: {
    reasoning: {
      content: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value },
        },
      ],
    },
  },
});

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

/**
 * A chat booted through `createChatSDK` with no view ever attached, so its
 * coordinator delivers reasoning headlessly from the start.
 */
async function headless() {
  const { instance, serviceManager: manager } = await bootPrebuiltChat({
    publicConfig: mergePublicConfig(createBaseConfig()),
  });
  chats.add(manager);
  return {
    instance,
    manager,
    store: manager.store,
    core: manager.messageCoordinator,
  };
}

const chats = new Set<ServiceManager>();
afterEach(async () => {
  await Promise.all([...chats].map((chat) => chat.shutdown()));
  chats.clear();
});

it('automatically delivers native reasoning from a public upsert without awaiting its handler', async () => {
  const { instance, core } = await headless();
  let release: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const values: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
      expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
      return pending;
    },
  });
  try {
    const message = response('native', 'native');
    await instance.messaging.upsertMessage(
      message.id,
      MessageState.COMPLETE,
      () => message
    );
    expect(values).toEqual(['native']);
  } finally {
    release();
    core.disposeReasoningObserver();
  }
});

it('retires a removed local session and creates a new one on public reinsertion', async () => {
  const { instance, core } = await headless();
  const values: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
    },
  });
  try {
    await instance.messaging.addMessage(response('legacy', 'first'));
    await instance.messaging.removeMessages(['legacy']);
    await instance.messaging.addMessage(response('legacy', 'second'));
    expect(values).toEqual(['first', 'second']);
  } finally {
    core.disposeReasoningObserver();
  }
});

it('rescans a targeted chunk with a retained message but skips an unchanged sibling', async () => {
  const { instance, store, core } = await headless();
  try {
    await instance.messaging.addMessage(response('sibling', 'sibling'));
    const message = response('target', 'target');
    await instance.messaging.upsertMessage(
      message.id,
      MessageState.STREAMING,
      () => message
    );
    const retained = store.getState().allMessagesByID.target;
    const notify = jest.spyOn(core, 'notifyReasoning');
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: 'target' },
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text: 'more',
        streaming_metadata: { id: 'answer' },
      },
    });
    expect(store.getState().allMessagesByID.target).toBe(retained);
    expect(notify.mock.calls.length).toBeGreaterThan(0);
    expect(notify.mock.calls.every((call) => call[1].id === 'target')).toBe(
      true
    );
  } finally {
    core.disposeReasoningObserver();
  }
});

it('cancels the queued initial scan and store subscription when disposed', async () => {
  const { instance, manager, core } = await headless();
  await instance.messaging.addMessage(response('existing', 'existing'));
  core.disposeReasoningObserver();
  const replacement = new MessageCoordinator(manager);
  manager.messageCoordinator = replacement;
  const notify = jest.spyOn(replacement, 'notifyReasoning');
  replacement.disposeReasoningObserver();
  await Promise.resolve();
  await instance.messaging.addMessage(response('later', 'later'));
  expect(notify).not.toHaveBeenCalled();
});

it.each(['mounted', 'headless'])(
  'preserves shared-event blocking by an already pending reasoning handler in %s mode',
  async (mode) => {
    const boot =
      mode === 'headless'
        ? await headless()
        : await renderChatAndGetInstanceWithStore(createBaseConfig());
    const { instance, store } = boot;
    let release: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const values: string[] = [];
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        const value = event.data.message.user_defined.value;
        values.push(value);
        if (value === 'reasoning') {
          return pending;
        }
        return undefined;
      },
    });
    try {
      await instance.messaging.addMessage(response('first', 'reasoning'));
      await waitFor(() => expect(values).toEqual(['reasoning']));
      let settled = false;
      const output: MessageResponse = {
        id: 'second',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'output' },
            },
          ],
        },
      };
      const result = instance.messaging
        .upsertMessage(output.id, MessageState.COMPLETE, () => output)
        .then(() => {
          settled = true;
        });
      await waitFor(() =>
        expect(store.getState().allMessagesByID.second).toBeDefined()
      );
      expect(values).toEqual(['reasoning']);
      expect(settled).toBe(false);
      release();
      await result;
      expect(values).toEqual(['reasoning', 'output']);
    } finally {
      release();
      if ('core' in boot) {
        (boot.core as MessageCoordinator).disposeReasoningObserver();
      }
    }
  }
);

// D7 of the #2349 plan: headless delivery runs whenever no view is attached,
// so a chat whose view detached keeps delivering reasoning items.
it('delivers headlessly once the view detaches', async () => {
  const { instance } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  unmountKeepingServices(instance);
  const values: unknown[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
    },
  });
  await instance.messaging.addMessage(response('hidden-view', 'reasoning'));
  await waitFor(() => expect(values).toEqual(['reasoning']));
});

describe('switching between mounted and headless delivery', () => {
  const collect = (instance: any) => {
    const values: string[] = [];
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        values.push(event.data.message.user_defined.value);
      },
    });
    return values;
  };
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  it('fires a mounted item once across a detach, and later items headlessly', async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const values = collect(instance);
    await instance.messaging.addMessage(response('mounted', 'first'));
    await waitFor(() => expect(values).toEqual(['first']));
    unmountKeepingServices(instance);
    await settle();
    expect(values).toEqual(['first']);
    await instance.messaging.addMessage(response('after', 'second'));
    await waitFor(() => expect(values).toEqual(['first', 'second']));
    await settle();
    expect(values).toEqual(['first', 'second']);
  });

  it('fires a headless item once across an attach, and later items through the view', async () => {
    const { instance, manager, core, store } = await headless();
    const values = collect(instance);
    try {
      const first = response('switch', 'first');
      await instance.messaging.addMessage(first);
      await waitFor(() => expect(values).toEqual(['first']));
      const detach = manager.view.attach({
        messaging: {} as any,
        humanAgent: { requestFocus: () => undefined },
        instance: idleInstancePort(),
      });
      const localID = () =>
        store.getState().allMessagesByID.switch &&
        store
          .getState()
          .assistantMessageState.localMessageIDs.find(
            (id: string) =>
              store.getState().allMessageItemsByID[id].fullMessageID ===
              'switch'
          );
      // What a mounted MessageComponent does when it renders the item.
      core.notifyMountedReasoning(
        localID(),
        store.getState().allMessagesByID.switch,
        new Set()
      );
      await settle();
      expect(values).toEqual(['first']);
      // While attached, a new item waits for the view, not the observer.
      await instance.messaging.addMessage(response('attached', 'second'));
      await settle();
      expect(values).toEqual(['first']);
      // The view never drew it; detaching hands it to headless delivery.
      detach();
      await waitFor(() => expect(values).toEqual(['first', 'second']));
      await settle();
      expect(values).toEqual(['first', 'second']);
    } finally {
      core.disposeReasoningObserver();
    }
  });
});

it('keeps per-local-item sessions and detects new reasoning positions from a chunk', async () => {
  const { instance, core } = await headless();
  const values: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
    },
  });
  try {
    const message = response('multiple', 'first');
    message.output.generic.push({
      response_type: MessageResponseTypes.TEXT,
      text: 'Second',
      streaming_metadata: { id: 'second' },
    });
    await instance.messaging.upsertMessage(
      message.id,
      MessageState.STREAMING,
      () => message
    );
    await waitFor(() => expect(values).toEqual(['first', 'first']));
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: message.id },
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text: 'more',
        streaming_metadata: { id: 'answer' },
      },
      partial_response: {
        message_options: {
          reasoning: {
            content: [
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: { value: 'first' },
              },
              {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: { value: 'new' },
              },
            ],
          },
        },
      },
    });
    await waitFor(() =>
      expect(values).toEqual(['first', 'first', 'new', 'new'])
    );
    await instance.messaging.restartConversation();
    expect(values).toEqual(['first', 'first', 'new', 'new']);
    await instance.messaging.addMessage(response('multiple', 'after restart'));
    await waitFor(() => expect(values).toContain('after restart'));
  } finally {
    core.disposeReasoningObserver();
  }
});

it.each(['removal', 'restart'])(
  'resamples a reentrant %s before notifying a sibling local session',
  async (mode) => {
    const { instance, core } = await headless();
    const values: string[] = [];
    let transition: Promise<void>;
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        values.push(event.data.message.user_defined.value);
        transition =
          mode === 'removal'
            ? instance.messaging.removeMessages(['removed'])
            : instance.messaging.restartConversation();
      },
    });
    try {
      const message = response('removed', 'first');
      message.output.generic.push({
        response_type: MessageResponseTypes.TEXT,
        text: 'Second',
        streaming_metadata: { id: 'second' },
      });
      await instance.messaging.upsertMessage(
        message.id,
        MessageState.COMPLETE,
        () => message
      );
      await transition;
      expect(values).toEqual(['first']);
    } finally {
      core.disposeReasoningObserver();
    }
  }
);

it('notifies core of instance readiness after actual bootstrap assigns the instance', async () => {
  const original = MessageCoordinator.prototype.onInstanceReady;
  const observed: unknown[] = [];
  const ready = jest
    .spyOn(MessageCoordinator.prototype, 'onInstanceReady')
    .mockImplementation(function (this: MessageCoordinator) {
      const manager = (this as any).serviceManager as ServiceManager;
      expect(manager.messageCoordinator).toBe(this);
      observed.push(manager.instance);
      return original.call(this);
    });
  try {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    expect(observed).toEqual([instance]);
  } finally {
    ready.mockRestore();
  }
});

it('creates a session only when a stored hidden response becomes visible', async () => {
  const { instance, store, core } = await headless();
  const values: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: any) => {
      values.push(event.data.message.user_defined.value);
    },
  });
  try {
    const hidden = response('hidden', 'reasoning');
    hidden.history = { silent: true };
    await instance.messaging.addMessage(hidden);
    expect(store.getState().allMessagesByID.hidden).toBeDefined();
    expect(values).toEqual([]);
    const visible = response('hidden', 'reasoning');
    await instance.messaging.upsertMessage(
      visible.id,
      MessageState.COMPLETE,
      () => visible
    );
    await waitFor(() => expect(values).toEqual(['reasoning']));
    await instance.messaging.upsertMessage(
      visible.id,
      MessageState.COMPLETE,
      () => visible
    );
    expect(values).toEqual(['reasoning']);
  } finally {
    core.disposeReasoningObserver();
  }
});

it.each(['mounted', 'headless'])(
  'preserves awaited output and receive order with observational reasoning in %s mode',
  async (mode) => {
    const boot =
      mode === 'headless'
        ? await headless()
        : await renderChatAndGetInstanceWithStore(createBaseConfig());
    const { instance } = boot;
    let release: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const trace: string[] = [];
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: async (event: any) => {
        if (event.data.message.user_defined.value === 'output') {
          trace.push('output:start');
          await pending;
          trace.push('output:end');
        }
      },
    });
    instance.on({
      type: BusEventType.RECEIVE,
      handler: () => {
        trace.push('receive');
      },
    });
    let result: Promise<void>;
    try {
      const message = response('paired', 'reasoning');
      message.output.generic = [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { value: 'output' },
        },
      ];
      let settled = false;
      result = instance.messaging
        .upsertMessage(message.id, MessageState.COMPLETE, () => message)
        .then(() => {
          settled = true;
        });
      await waitFor(() => expect(trace).toEqual(['output:start']));
      expect(settled).toBe(false);
      release();
      await result;
      expect(trace).toEqual(['output:start', 'output:end', 'receive']);
    } finally {
      release();
      await result;
      if ('core' in boot) {
        (boot.core as MessageCoordinator).disposeReasoningObserver();
      }
    }
  }
);

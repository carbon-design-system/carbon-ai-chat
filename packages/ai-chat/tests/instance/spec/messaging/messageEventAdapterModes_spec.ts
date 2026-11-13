/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, cleanup, waitFor } from '@testing-library/react';
import { MessageCoordinator } from '../../../../src/chat/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../../src/chat/services/ServiceManager';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it.each([true, false])(
  'awaits a native pause, response callback, and receive with adapter=%s',
  async (withAdapter) => {
    const boot = await renderChatAndGetInstanceWithStore(createBaseConfig());
    const manager = (boot.serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    let core = manager.messageCoordinator;
    if (!withAdapter) {
      cleanup();
      core = new MessageCoordinator(manager);
      manager.messageCoordinator = core;
    }
    const releaseResponse = resolvablePromise<void>();
    const enteredReceive = resolvablePromise<void>();
    const releaseReceive = resolvablePromise<void>();
    const trace: string[] = [];
    boot.instance.on([
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: async (event: any) => {
          expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
          trace.push('response:start');
          await releaseResponse;
          trace.push('response:end');
        },
      },
      {
        type: BusEventType.RECEIVE,
        handler: async () => {
          trace.push('receive:start');
          enteredReceive.doResolve();
          await releaseReceive;
          trace.push('receive:end');
        },
      },
    ]);
    const response: MessageResponse = {
      id: 'paired-pause',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Before pause' },
          {
            response_type: MessageResponseTypes.PAUSE,
            time: 500,
            typing: true,
          },
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { value: 'After pause' },
          },
        ],
      },
    };
    const visibleItems = () => {
      const state = boot.store.getState();
      return state.assistantMessageState.localMessageIDs
        .map((id) => state.allMessageItemsByID[id])
        .filter((local) => local.fullMessageID === response.id)
        .map((local) => local.item);
    };
    const loadingCounter = () =>
      boot.store.getState().assistantMessageState.isMessageLoadingCounter;
    const baselineLoading = loadingCounter();
    let settled = false;
    let work: Promise<void>;
    jest.useFakeTimers();
    try {
      work = boot.instance.messaging
        .upsertMessage(response.id, MessageState.COMPLETE, () => response)
        .then(() => {
          settled = true;
        });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(visibleItems()).toEqual([response.output.generic[0]]);
      expect(loadingCounter()).toBe(baselineLoading + 1);
      expect(trace).toEqual([]);
      expect(settled).toBe(false);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(499);
      });
      expect(visibleItems()).toEqual([response.output.generic[0]]);
      expect(trace).toEqual([]);
      expect(settled).toBe(false);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(visibleItems()).toEqual([
        response.output.generic[0],
        response.output.generic[2],
      ]);
      expect(loadingCounter()).toBe(baselineLoading);
      expect(trace).toEqual(['response:start']);
      expect(settled).toBe(false);

      await act(async () => {
        releaseResponse.doResolve();
        await enteredReceive;
      });
      expect(trace).toEqual([
        'response:start',
        'response:end',
        'receive:start',
      ]);
      expect(settled).toBe(false);
      await act(async () => {
        releaseReceive.doResolve();
        await work;
      });
      expect(trace).toEqual([
        'response:start',
        'response:end',
        'receive:start',
        'receive:end',
      ]);
      expect(settled).toBe(true);
    } finally {
      try {
        await act(async () => {
          releaseResponse.doResolve();
          releaseReceive.doResolve();
          await jest.advanceTimersByTimeAsync(500);
          await work;
        });
      } finally {
        core.disposeReasoningObserver();
        jest.useRealTimers();
      }
    }
  }
);

it.each([true, false])(
  'keeps the public native response callback awaited with adapter=%s',
  async (withAdapter) => {
    const boot = await renderChatAndGetInstanceWithStore(createBaseConfig());
    const manager = (boot.serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    let core = manager.messageCoordinator;
    if (!withAdapter) {
      cleanup();
      core = new MessageCoordinator(manager);
      manager.messageCoordinator = core;
    }
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const trace: string[] = [];
    boot.instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: (event: any) => {
        trace.push('response');
        expect(Object.isFrozen(event.data.fullMessage)).toBe(true);
        return blocked;
      },
    });
    boot.instance.on({
      type: BusEventType.RECEIVE,
      handler: () => {
        trace.push('receive');
      },
    });
    const response: MessageResponse = {
      id: 'paired-native',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { value: 1 },
          },
        ],
      },
    };
    let settled = false;
    const work = boot.instance.messaging
      .upsertMessage(response.id, MessageState.COMPLETE, () => response)
      .then(() => {
        settled = true;
      });
    try {
      await waitFor(() => expect(trace).toEqual(['response']));
      expect(settled).toBe(false);
      release();
      await work;
      expect(trace).toEqual(['response', 'receive']);
      expect(settled).toBe(true);
    } finally {
      release();
      await work;
      (core as any).disposeReasoningObserver?.();
    }
  }
);

it.each([true, false])(
  'keeps the public native footer callback awaited with adapter=%s',
  async (withAdapter) => {
    const boot = await renderChatAndGetInstanceWithStore(createBaseConfig());
    const manager = (boot.serviceManager.messageCoordinator as any)
      .serviceManager as ServiceManager;
    let core = manager.messageCoordinator;
    if (!withAdapter) {
      cleanup();
      core = new MessageCoordinator(manager);
      manager.messageCoordinator = core;
    }
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const trace: string[] = [];
    boot.instance.on({
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: (event: any) => {
        trace.push('footer');
        expect(Object.isFrozen(event.data.message)).toBe(true);
        return blocked;
      },
    });
    boot.instance.on({
      type: BusEventType.RECEIVE,
      handler: () => {
        trace.push('receive');
      },
    });
    const response: MessageResponse = {
      id: 'paired-footer',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'answer',
            message_item_options: {
              custom_footer_slot: {
                is_on: true,
                slot_name: 'paired-footer-slot',
              },
            },
          },
        ],
      },
    };
    let settled = false;
    const work = boot.instance.messaging
      .upsertMessage(response.id, MessageState.COMPLETE, () => response)
      .then(() => {
        settled = true;
      });
    try {
      await waitFor(() => expect(trace).toEqual(['footer']));
      expect(settled).toBe(false);
      release();
      await work;
      expect(trace).toEqual(['footer', 'receive']);
      expect(settled).toBe(true);
    } finally {
      release();
      await work;
      (core as any).disposeReasoningObserver?.();
    }
  }
);

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { cleanup, waitFor } from '@testing-library/react';
import { MessageCoordinator } from '../../../../src/shared/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../../src/shared/services/ServiceManager';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

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

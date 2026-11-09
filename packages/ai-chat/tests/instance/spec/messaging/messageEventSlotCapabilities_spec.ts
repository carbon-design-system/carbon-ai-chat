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
import { MessagePresentationAdapter } from '../../../../src/chat/services/MessagePresentationAdapter';
import { SlotEventService } from '../../../../src/shared/services/messaging/presentation/SlotEventService';
import type { ServiceManager } from '../../../../src/shared/services/ServiceManager';
import { resolvablePromise } from '../../../../src/shared/utils/resolvablePromise';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventUserDefinedResponse,
} from '../../../../src/types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

function response(value: number): MessageResponse {
  return {
    id: 'slot-capability-response',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          streaming_metadata: { id: 'stable-item' },
          user_defined: { value },
        },
      ],
    },
  };
}

function liveManager(exposed: ServiceManager) {
  // The public testing property is a shallow copy; replace capabilities on the boot owner.
  return (
    exposed.messageCoordinator as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
}

it('uses the boot adapter current slot service and registry, then reuses the same item slot', async () => {
  const { instance, serviceManager } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const manager = liveManager(serviceManager);
  const slots: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      slots.push(event.data.slot);
    },
  });
  const originalRegistry = manager.userDefinedElementRegistry;
  const firstLookup = jest.spyOn(
    manager.slotEventService,
    'getOrCreateUserDefinedElement'
  );
  await instance.messaging.upsertMessage(
    response(1).id,
    MessageState.COMPLETE,
    () => response(1)
  );
  expect(slots).toHaveLength(1);
  const itemID = firstLookup.mock.calls[0][0];
  expect(originalRegistry.get(itemID).slotName).toBe(slots[0]);
  firstLookup.mockClear();

  manager.slotEventService = new SlotEventService(manager);
  manager.userDefinedElementRegistry = new Map();
  const replacementLookup = jest.spyOn(
    manager.slotEventService,
    'getOrCreateUserDefinedElement'
  );
  await instance.messaging.upsertMessage(
    response(2).id,
    MessageState.COMPLETE,
    () => response(2)
  );
  expect(slots).toHaveLength(2);
  expect(replacementLookup).toHaveBeenCalledWith(itemID);
  expect(slots[1]).not.toBe(slots[0]);
  expect(manager.userDefinedElementRegistry.get(itemID).slotName).toBe(
    slots[1]
  );
  expect(originalRegistry.get(itemID).slotName).toBe(slots[0]);
  replacementLookup.mockClear();

  await instance.messaging.upsertMessage(
    response(3).id,
    MessageState.COMPLETE,
    () => response(3)
  );
  expect(slots).toEqual([slots[0], slots[1], slots[1]]);
  expect(firstLookup).not.toHaveBeenCalled();
  expect(replacementLookup).toHaveBeenCalledWith(itemID);
  expect(manager.userDefinedElementRegistry.size).toBe(1);
});

it('delivers and awaits response events when a real adapter has no slot capability', async () => {
  const { instance, serviceManager } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const manager = liveManager(serviceManager);
  cleanup();
  const adapter = new MessagePresentationAdapter({
    hasCustomPromptLine: () => false,
    announceSending: jest.fn(),
    requestComposerFocus: () => false,
    isHomeScreenOpen: () => false,
    closeHomeScreen: jest.fn(),
    isResponsePanelOpen: () => false,
    closeResponsePanel: jest.fn(),
  });
  manager.messageCoordinator = new MessageCoordinator(manager, adapter);
  const allocate = jest.spyOn(
    manager.slotEventService,
    'getOrCreateUserDefinedElement'
  );
  const release = resolvablePromise<void>();
  const trace: string[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      expect(event.data.slot).toBeUndefined();
      expect(event.data.message.user_defined).toEqual({ value: 1 });
      trace.push('response');
      return release;
    },
  });
  instance.on({
    type: BusEventType.RECEIVE,
    handler: () => {
      trace.push('receive');
    },
  });
  let settled = false;
  const work = instance.messaging
    .upsertMessage(response(1).id, MessageState.COMPLETE, () => response(1))
    .then(() => {
      settled = true;
    });
  try {
    await waitFor(() => expect(trace).toEqual(['response']));
    expect(settled).toBe(false);
    expect(allocate).not.toHaveBeenCalled();
    release.doResolve();
    await work;
    expect(trace).toEqual(['response', 'receive']);
    expect(settled).toBe(true);
    expect(allocate).not.toHaveBeenCalled();
  } finally {
    release.doResolve();
    await work;
  }
});

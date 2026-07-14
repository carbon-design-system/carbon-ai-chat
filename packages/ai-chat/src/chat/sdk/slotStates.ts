/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from "../services/ServiceManager";
import { createValueStore, ReadableValueStore, ValueStore } from "./valueStore";
import {
  BusEventChunkUserDefinedResponse,
  BusEventCustomFooterSlot,
  BusEventType,
  BusEventUserDefinedResponse,
} from "../../types/events/eventBusTypes";
import {
  RenderCustomMessageFooterState,
  RenderUserDefinedState,
} from "../../types/component/slotStates";

/**
 * Framework-agnostic slot-projection state for the two portal surfaces (user-defined responses and
 * custom message footers), keyed by slot. The core owns these value stores and reduces the relevant
 * bus events into them; the React (and, later, Lit) view layer subscribes for rendering. Because
 * the stores hang off the {@link ServiceManager}, the accumulated state survives a host remount —
 * a remounting subscriber reads the current value on first `get()`, no setter repointing required.
 */
export interface ChatSlotStates {
  /** User-defined-response state by slot, reduced from the USER_DEFINED_RESPONSE event family. */
  userDefinedBySlot: ReadableValueStore<Record<string, RenderUserDefinedState>>;
  /** Custom-message-footer state by slot, reduced from the CUSTOM_FOOTER_SLOT event. */
  customFooterBySlot: ReadableValueStore<
    Record<string, RenderCustomMessageFooterState>
  >;
}

/**
 * Registers the USER_DEFINED_RESPONSE / CHUNK_USER_DEFINED_RESPONSE / CUSTOM_FOOTER_SLOT /
 * RESTART_CONVERSATION handlers on the instance's event bus (once, idempotently) and reduces them
 * into two {@link ValueStore}s. Called during boot so events fired before the view subscribes are
 * still captured. On a re-call for a manager that already has `slotStates`, returns the existing
 * stores without re-registering handlers.
 */
export function attachSlotStateTracking(
  serviceManager: ServiceManager,
): ChatSlotStates {
  if (serviceManager.slotStates) {
    return serviceManager.slotStates;
  }

  const userDefinedBySlot: ValueStore<Record<string, RenderUserDefinedState>> =
    createValueStore({});
  const customFooterBySlot: ValueStore<
    Record<string, RenderCustomMessageFooterState>
  > = createValueStore({});

  function userDefinedResponseHandler(event: BusEventUserDefinedResponse) {
    userDefinedBySlot.set((bySlot) => ({
      ...bySlot,
      [event.data.slot]: {
        fullMessage: event.data.fullMessage,
        messageItem: event.data.message,
        state: event.data.state,
      },
    }));
  }

  function userDefinedChunkHandler(event: BusEventChunkUserDefinedResponse) {
    if ("complete_item" in event.data.chunk) {
      const messageItem = event.data.chunk.complete_item;
      userDefinedBySlot.set((bySlot) => ({
        ...bySlot,
        [event.data.slot]: {
          messageItem,
        },
      }));
    } else if ("partial_item" in event.data.chunk) {
      const itemChunk = event.data.chunk.partial_item;
      userDefinedBySlot.set((bySlot) => ({
        ...bySlot,
        [event.data.slot]: {
          partialItems: [
            ...(bySlot[event.data.slot]?.partialItems || []),
            itemChunk,
          ],
        },
      }));
    }
  }

  function customFooterSlotHandler(event: BusEventCustomFooterSlot) {
    customFooterBySlot.set((bySlot) => ({
      ...bySlot,
      [event.data.slotName]: {
        slotName: event.data.slotName,
        message: event.data.message,
        messageItem: event.data.messageItem,
        additionalData: event.data.additionalData as
          | Record<string, unknown>
          | undefined,
      },
    }));
  }

  function restartHandler() {
    userDefinedBySlot.set({});
    customFooterBySlot.set({});
  }

  serviceManager.instance.on({
    type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
    handler: userDefinedChunkHandler,
  });
  serviceManager.instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: userDefinedResponseHandler,
  });
  serviceManager.instance.on({
    type: BusEventType.CUSTOM_FOOTER_SLOT,
    handler: customFooterSlotHandler,
  });
  serviceManager.instance.on({
    type: BusEventType.RESTART_CONVERSATION,
    handler: restartHandler,
  });

  const slotStates: ChatSlotStates = {
    userDefinedBySlot,
    customFooterBySlot,
  };
  serviceManager.slotStates = slotStates;
  return slotStates;
}

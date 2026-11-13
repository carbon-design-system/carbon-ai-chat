/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventType,
  type BusEventChunkUserDefinedResponse,
  type BusEventCustomFooterSlot,
  type BusEventCustomRequestFooterSlot,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';
import type { MessageState } from '../../types/config/MessagingConfig';
import type {
  GenericItem,
  Message,
  MessageRequest,
  MessageResponse,
} from '../../types/messaging/Messages';
import type { DeepPartial } from '../../types/utilities/DeepPartial';
import {
  createValueStore,
  type ReadableValueStore,
  type ValueStore,
} from '../store/valueStore';
import type { ServiceManager } from './ServiceManager';

// The public `RenderUserDefinedState` and `RenderCustomMessageFooterState` live
// in a types module that imports React, which SDK code can't reach. These
// match them field for field; a type test fails if either side changes.

/** One user-defined response slot. Matches `RenderUserDefinedState`. */
interface UserDefinedSlotState {
  fullMessage?: Message;
  messageItem?: GenericItem;
  partialItems?: DeepPartial<GenericItem>[];
  state?: MessageState;
}

/** One custom footer slot. Matches `RenderCustomMessageFooterState`. */
interface CustomFooterSlotState {
  slotName: string;
  message: MessageResponse;
  messageItem: GenericItem;
  additionalData?: Record<string, unknown>;
}

interface CustomRequestFooterSlotState {
  slotName: string;
  message: MessageRequest;
}

/** Each slot's state, by slot name. */
type SlotRecords<T> = Readonly<Record<string, T>>;

/** The slot state of one chat, readable without a view. */
interface SlotStores {
  /** User-defined response slots, filled by full and chunked responses. */
  readonly userDefinedResponse: ReadableValueStore<
    SlotRecords<UserDefinedSlotState>
  >;
  /** Custom footer slots below assistant messages. */
  readonly customFooter: ReadableValueStore<SlotRecords<CustomFooterSlotState>>;
  /**
   * Footers under the user's messages. Collected only while a view says it
   * renders them (see {@link collectRequestFooters}), because that event fires
   * for every message the user sends.
   */
  readonly customRequestFooter: ReadableValueStore<
    SlotRecords<CustomRequestFooterSlotState>
  >;
}

/** Each chat's request-footer gates: a footer is kept if any says so. */
const requestFooterGates = new WeakMap<ServiceManager, Set<() => boolean>>();

/** The empty records every store starts at and returns to on restart. */
const EMPTY: SlotRecords<never> = Object.freeze({});

const tracked = new WeakMap<ServiceManager, SlotStores>();

function setSlot<T>(
  store: ValueStore<SlotRecords<T>>,
  slot: string | undefined,
  record: T
) {
  // A silent item, or one that fired with no view to name its slot, has no
  // slot to render into.
  if (!slot) {
    return;
  }
  store.set({ ...store.get(), [slot]: record });
}

/**
 * Starts keeping the chat's slot state in stores, from the slot events on its
 * bus, and returns them. A restart empties all three, the response store
 * first, so a listener reading several stores can see the later ones emptied
 * a moment later.
 * Calling it again for the same chat returns the same stores and adds no
 * second listener.
 *
 * The records follow the same rules as the view's extension hosts, so the
 * view can read them from here instead.
 */
function attachSlotTracking(serviceManager: ServiceManager): SlotStores {
  const existing = tracked.get(serviceManager);
  if (existing) {
    return existing;
  }

  const userDefinedResponse =
    createValueStore<SlotRecords<UserDefinedSlotState>>(EMPTY);
  const customFooter =
    createValueStore<SlotRecords<CustomFooterSlotState>>(EMPTY);
  const customRequestFooter =
    createValueStore<SlotRecords<CustomRequestFooterSlotState>>(EMPTY);
  const gates = new Set<() => boolean>();
  requestFooterGates.set(serviceManager, gates);

  const handlers: TypeAndHandler[] = [
    {
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: ({ data }: BusEventUserDefinedResponse) => {
        setSlot(userDefinedResponse, data.slot, {
          fullMessage: data.fullMessage,
          messageItem: data.message,
          state: data.state,
        });
      },
    },
    {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: ({ data }: BusEventChunkUserDefinedResponse) => {
        const { slot, chunk } = data;
        if ('complete_item' in chunk) {
          setSlot(userDefinedResponse, slot, {
            messageItem: chunk.complete_item,
          });
        } else if ('partial_item' in chunk) {
          const partialItems =
            userDefinedResponse.get()[slot]?.partialItems ?? [];
          setSlot(userDefinedResponse, slot, {
            partialItems: [...partialItems, chunk.partial_item],
          });
        }
      },
    },
    {
      type: BusEventType.CUSTOM_FOOTER_SLOT,
      handler: ({ data }: BusEventCustomFooterSlot) => {
        const { slotName, message, messageItem, additionalData } = data;
        setSlot(customFooter, slotName, {
          slotName,
          message,
          messageItem,
          additionalData: additionalData as Record<string, unknown> | undefined,
        });
      },
    },
    {
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: ({ data }: BusEventCustomRequestFooterSlot) => {
        if ([...gates].some((isEnabled) => isEnabled())) {
          const { slotName, message } = data;
          setSlot(customRequestFooter, slotName, { slotName, message });
        }
      },
    },
    {
      type: BusEventType.RESTART_CONVERSATION,
      handler: () => {
        userDefinedResponse.set(EMPTY);
        customFooter.set(EMPTY);
        customRequestFooter.set(EMPTY);
      },
    },
  ];
  serviceManager.eventBus.on(handlers);

  const stores: SlotStores = Object.freeze({
    userDefinedResponse: readOnly(userDefinedResponse),
    customFooter: readOnly(customFooter),
    customRequestFooter: readOnly(customRequestFooter),
  });
  tracked.set(serviceManager, stores);
  return stores;
}

/** Hides `set`, so only tracking writes. */
function readOnly<T>({ get, subscribe }: ValueStore<T>): ReadableValueStore<T> {
  return Object.freeze({ get, subscribe });
}

/**
 * Collects request footers while `isEnabled` says so, for a view that renders
 * them. Asked on each footer event, so a render callback set after boot still
 * collects. Returns a function that stops this gate.
 */
function collectRequestFooters(
  serviceManager: ServiceManager,
  isEnabled: () => boolean
): () => void {
  attachSlotTracking(serviceManager);
  const gates = requestFooterGates.get(serviceManager);
  gates.add(isEnabled);
  return () => {
    gates.delete(isEnabled);
  };
}

/** A chat's slot stores, plus the request-footer gate, for a view to read. */
interface SlotSource {
  readonly stores: SlotStores;
  collectRequestFooters(isEnabled: () => boolean): () => void;
}

/** The slot source for a chat's service manager. */
function slotSource(serviceManager: ServiceManager): SlotSource {
  return {
    stores: attachSlotTracking(serviceManager),
    collectRequestFooters: (isEnabled) =>
      collectRequestFooters(serviceManager, isEnabled),
  };
}

export {
  attachSlotTracking,
  collectRequestFooters,
  EMPTY as EMPTY_SLOT_RECORDS,
  slotSource,
};
export type {
  CustomFooterSlotState,
  CustomRequestFooterSlotState,
  SlotSource,
  SlotStores,
  UserDefinedSlotState,
};

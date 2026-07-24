/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { BusEvent, BusEventType } from "../events/eventBusTypes";
import type { ChatInstance } from "./ChatInstance";

/**
 * This is a subset of the public interface that is managed by the event bus that is used for registering and
 * unregistering event listeners on the bus.
 *
 * @category Instance
 */
export interface EventHandlers {
  /**
   * Adds the given event handler as a listener for events of the given type.
   *
   * @param handlers The handler or handlers along with the event type to start listening for events.
   * @returns The instance for method chaining.
   *
   * @example Listen for received messages, chaining a second subscription
   * ```ts
   * import { BusEventType } from "@carbon/ai-chat";
   *
   * instance
   *   .on({ type: BusEventType.RECEIVE, handler: (event) => console.log(event.data) })
   *   .on({ type: BusEventType.VIEW_CHANGE, handler: (event) => console.log(event.newViewState) });
   * ```
   */
  on: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;

  /**
   * Removes an event listener that was previously added via {@link on} or {@link once}.
   *
   * @param handlers The handler or handlers along with the event type to stop listening for events.
   * @returns The instance for method chaining.
   *
   * @example Remove a previously registered handler
   * ```ts
   * import { BusEventType } from "@carbon/ai-chat";
   *
   * // off requires the same handler reference passed to on.
   * const onReceive = (event) => console.log(event.data);
   * instance.on({ type: BusEventType.RECEIVE, handler: onReceive });
   * instance.off({ type: BusEventType.RECEIVE, handler: onReceive });
   * ```
   */
  off: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;

  /**
   * Adds the given event handler as a listener for events of the given type. After the first event is handled, this
   * handler will automatically be removed.
   *
   * @param handlers The handler or handlers along with the event type to start listening for an event.
   * @returns The instance for method chaining.
   *
   * @example Run a handler only on the first chat-ready event
   * ```ts
   * import { BusEventType } from "@carbon/ai-chat";
   *
   * instance.once({
   *   type: BusEventType.CHAT_READY,
   *   handler: () => console.log("chat is ready"),
   * });
   * ```
   */
  once: (handlers: TypeAndHandler | TypeAndHandler[]) => EventHandlers;
}

/**
 * The type of handler for event bus events. This function may return a Promise in which case, the bus will await
 * the result and the loop will block until the Promise is resolved.
 *
 * @category Instance
 */
export type EventBusHandler<T extends BusEvent = BusEvent> = (
  event: T,
  instance: ChatInstance,
) => unknown;

/**
 * The type of the object that is passed to the event bus functions (e.g. "on") when registering a handler.
 *
 * @category Instance
 */
export interface TypeAndHandler {
  /**
   * The type of event this handler is for.
   */
  type: BusEventType;

  /**
   * The handler for events of this type.
   */
  handler: EventBusHandler;
}

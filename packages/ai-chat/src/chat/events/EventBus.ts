/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is our event bus. It takes subscriptions to events and attaches handlers that are called when
 * the event is fired.
 */

import cloneDeep from "lodash-es/cloneDeep.js";

import { BusEvent, BusEventType } from "../../types/events/eventBusTypes";
import { asArray, asyncForEach } from "../utils/lang/arrayUtils";
import {
  consoleError,
  consoleLog,
  consoleWarn,
  debugLog,
  isEnableDebugLog,
} from "../utils/miscUtils";
import {
  ResolvablePromise,
  resolvablePromise,
} from "../utils/resolvablePromise";
import {
  ChatInstance,
  EventBusHandler,
  TypeAndHandler,
} from "../../types/instance/ChatInstance";

const HANDLER_NOT_FUNCTION = "The event handler is not a function.";

class EventBus {
  /**
   * This is a map of all the event handlers by type with the map key being the type of event (e.g. "send").
   */
  private handlersByType: Map<string, EventBusHandler[]> = new Map();

  /**
   * This set is used to keep track of which events are currently running. This is to prevent the same event from
   * running more than once at the same time. This check is only performed on asynchronous events and does not cover
   * the "*" event.
   */
  private eventsTypesRunning: Set<BusEventType> = new Set();

  /**
   * This is the Promise used by the {@link waitForEmpty} function.
   */
  private waitForEmptyPromise: ResolvablePromise;

  /**
   * The current number of async events that are currently running.
   */
  private eventsRunningCount = 0;

  /**
   * Fires the given event and notifiers all listeners for this event type. All event listeners that listen for all
   * ("*") events will also be notified. Events will be fired in the order in which they were registered.
   *
   * @param busEvent A single event.
   * @param instance The current instance of the Carbon AI Chat that is passed to the event handlers
   */
  async fire<T extends BusEvent>(busEvent: T, instance: ChatInstance) {
    logEvent("Before fire", busEvent);
    const { type } = busEvent;

    if (!type) {
      throw new Error(
        `Attempted to fire an event with no type! ${JSON.stringify(busEvent)}`,
      );
    }

    function wrappedHandler(handler: EventBusHandler) {
      const result = handler(busEvent, instance);
      if (result && !(result instanceof Promise)) {
        consoleWarn(
          `An event handler for event ${type} returned a non-promise. This might be a mistake.`,
          result,
        );
      }
      return result;
    }

    if (this.eventsTypesRunning.has(type)) {
      throw new Error(
        `An event of type ${type} is already running. Please make sure that you have resolved the Promises for any earlier events that were fired.`,
      );
    }

    try {
      this.eventsRunningCount++;

      try {
        this.eventsTypesRunning.add(type);

        // Run all the handlers for the given type.
        const handlersForType = this.handlersByType.get(type);
        if (handlersForType && handlersForType.length) {
          // Copy the array in case it's modified by an event handler.
          const handlersCopy = handlersForType.slice();
          await asyncForEach(handlersCopy, wrappedHandler);
        }
      } finally {
        this.eventsTypesRunning.delete(type);
      }
    } finally {
      this.eventsRunningCount--;

      if (this.waitForEmptyPromise && this.eventsRunningCount === 0) {
        // If waitForEmpty is waiting for all the events to finish and we've just finished the last one, then let it
        // know.
        this.waitForEmptyPromise.doResolve();
      }
    }

    logEvent("After fire", busEvent);
  }

  /**
   * Fires the given event and notifiers all listeners for this event type. All event listeners that listen for all
   * ("*") events will also be notified. Events will be fired in the order in which they were registered. This
   * function fires the events synchronously.
   *
   * @param busEvent A single event.
   * @param instance The current instance of the Carbon AI Chat that is passed to the event handlers
   */
  fireSync<T extends BusEvent>(busEvent: T, instance: ChatInstance) {
    logEvent("Before fire", busEvent);

    const { type } = busEvent;

    // Run all the handlers for the given type.
    const handlersForType = this.handlersByType.get(type);
    if (handlersForType && handlersForType.length) {
      // Copy the array in case it's modified by an event handler.
      const handlersCopy = handlersForType.slice();
      handlersCopy.forEach((handler) => handler(busEvent, instance));
    }

    logEvent("After fire", busEvent);
  }

  /**
   * This function will wait for all executing async events to finish. If any new events are fired while this
   * function is waiting, it will wait for those as well.
   */
  async waitForEmpty() {
    if (this.eventsRunningCount === 0) {
      return;
    }

    if (!this.waitForEmptyPromise) {
      this.waitForEmptyPromise = resolvablePromise();
    }

    await this.waitForEmptyPromise;

    this.waitForEmptyPromise = null;
  }

  /**
   * Adds the given event handler as a listener for events of the given type.
   *
   * @param handlers The handler or handlers along with the event type to start listening for events.
   * @returns The instance for method chaining.
   */
  on(handlers: TypeAndHandler | TypeAndHandler[]) {
    const data = asArray(handlers);
    data.forEach(({ type, handler }) => {
      if (!type) {
        throw new Error(
          `Attempted to listen to an event with no type: "${type}"!`,
        );
      }

      if (typeof handler === "function") {
        if (!this.handlersByType.has(type)) {
          this.handlersByType.set(type, []);
        }
        const handlersForType = this.handlersByType.get(type);
        handlersForType.push(handler);
      } else {
        consoleError(HANDLER_NOT_FUNCTION, handler);
      }
    });
    return this;
  }

  /**
   * Removes an event listener that was previously added via {@link on} or {@link once}.
   *
   * @param handlers The handler or handlers along with the event type to stop listening for events.
   * @returns The instance for method chaining.
   */
  off(handlers: TypeAndHandler | TypeAndHandler[]) {
    const data: TypeAndHandler[] = asArray(handlers);
    data.forEach(({ type, handler }) => {
      const handlersForType = this.handlersByType.get(type);
      if (handlersForType) {
        if (handler) {
          const index = handlersForType.indexOf(handler);
          if (index !== -1) {
            handlersForType.splice(index, 1);
          }
        } else {
          // If no handler is specified, unsubscribe all the handlers.
          this.handlersByType.set(type, []);
        }
      }
    });
    return this;
  }

  /**
   * Adds the given event handler as a listener for events of the given type. After the first event is handled, this
   * handler will automatically be removed.
   *
   * @param handlers The handler or handlers along with the event type to start listening for an event.
   * @returns The instance for method chaining.
   */
  once(handlers: TypeAndHandler | TypeAndHandler[]) {
    const data = asArray(handlers);
    data.forEach(({ type, handler }) => {
      if (typeof handler === "function") {
        const onceHandler = (event: BusEvent, instance: ChatInstance) => {
          this.off({ type, handler: onceHandler });
          return handler(event, instance);
        };
        this.on({ type, handler: onceHandler });
      } else {
        consoleError(HANDLER_NOT_FUNCTION, handler);
      }
    });
    return this;
  }

  /**
   * Outputs debug information for all of the currently registered event bus listeners.
   */
  logListeners() {
    this.handlersByType.forEach((listeners, type) => {
      console.group(`Event ${type} (${listeners.length})`);
      listeners.forEach((listener) => {
        consoleLog("Listener", listener);
      });
      console.groupEnd();
    });
  }

  clear() {
    this.handlersByType.clear();
    return this;
  }
}

/**
 * Outputs the given event to the console.
 */
function logEvent(message: string, busEvent: BusEvent) {
  if (isEnableDebugLog()) {
    // If this object is modified after we log it, the output may not actually show the original value so making a
    // copy ensure we see the actual value that it had at this moment.
    const eventCopy = cloneDeep(busEvent);
    debugLog(`[EventBus] ${message}`, eventCopy);
  }
}

export { EventBus };

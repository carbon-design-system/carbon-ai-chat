/*
 *  Copyright IBM Corp. 2025, 2026
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

import cloneDeep from 'lodash-es/cloneDeep.js';

import { BusEvent, BusEventType } from '../../types/events/eventBusTypes';
import { asArray, asyncForEach } from '../utils/lang/arrayUtils';
import {
  consoleError,
  consoleLog,
  consoleWarn,
  debugLog,
  isEnableDebugLog,
} from '../utils/miscUtils';
import {
  ResolvablePromise,
  resolvablePromise,
} from '../utils/resolvablePromise';
import { ChatInstance } from '../../types/instance/ChatInstance';
import {
  EventBusHandler,
  TypeAndHandler,
} from '../../types/instance/EventHandlers';

const HANDLER_NOT_FUNCTION = 'The event handler is not a function.';
const WILDCARD_EVENT_TYPE = '*';

/**
 * How long a fire may wait behind an earlier fire of the same type before the bus gives up on it. A handler that
 * waits on a chat call firing its own type never lets the earlier fire finish, and this turns that deadlock back into
 * a rejected call.
 */
const QUEUED_FIRE_TIMEOUT_MS = 10_000;

const noop = () => {
  /* intentionally empty */
};

interface QueuedFire {
  /** Settles, never rejecting, once this fire is over. */
  done: Promise<void>;
}

class EventBus {
  /**
   * This is a map of all the event handlers by type with the map key being the type of event (e.g. "send").
   */
  private handlersByType: Map<string, EventBusHandler[]> = new Map();

  /**
   * The latest fire of each event type that has not finished yet. A new fire of a type listed here waits for this one
   * before its handlers start, so overlapping fires of one type run in call order. Fires of different types never
   * wait on each other. A same-type fire made synchronously from inside a handler runs nested, before this entry is
   * set, and a fire that timed out stops tracking the one it waited on.
   */
  private queuedFireByType: Map<BusEventType, QueuedFire> = new Map();

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
   * If an earlier fire of the same type is still running, this one waits for it to settle before its handlers
   * start, so overlapping fires of one type run in the order they were called. A fire that waits longer than
   * `QUEUED_FIRE_TIMEOUT_MS` rejects without running its handlers.
   *
   * @param busEvent A single event.
   * @param instance The current instance of the Carbon AI Chat that is passed to the event handlers
   */
  async fire<T extends BusEvent>(busEvent: T, instance: ChatInstance) {
    logEvent('Before fire', busEvent);
    const { type } = busEvent;

    if (!type) {
      throw new Error(
        `Attempted to fire an event with no type! ${JSON.stringify(busEvent)}`
      );
    }

    this.eventsRunningCount++;
    const thisEntry: QueuedFire = { done: undefined };
    const release = () => {
      if (this.queuedFireByType.get(type) === thisEntry) {
        this.queuedFireByType.delete(type);
      }
    };
    try {
      const run = async () => {
        try {
          await this.runHandlers(busEvent, instance);
        } finally {
          release();
        }
      };
      const previousEntry = this.queuedFireByType.get(type);
      // With nothing of this type queued, run straight away so the handlers start synchronously as they always have.
      const thisFire = previousEntry
        ? this.runAfter(previousEntry.done, type, run)
        : run();
      thisEntry.done = thisFire.then(noop, noop);
      this.queuedFireByType.set(type, thisEntry);

      await thisFire;
    } finally {
      release();
      this.eventsRunningCount--;

      if (this.waitForEmptyPromise && this.eventsRunningCount === 0) {
        // If waitForEmpty is waiting for all the events to finish and we've just finished the last one, then let it
        // know.
        this.waitForEmptyPromise.doResolve();
      }
    }

    logEvent('After fire', busEvent);
  }

  /**
   * Runs the handlers once the previous fire of the same type settles, or rejects if that takes longer than
   * `QUEUED_FIRE_TIMEOUT_MS`.
   */
  private async runAfter(
    previousFire: Promise<void>,
    type: BusEventType,
    run: () => Promise<void>
  ) {
    let timer: ReturnType<typeof setTimeout>;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `A ${type} event waited ${QUEUED_FIRE_TIMEOUT_MS / 1000} seconds for an earlier ${type} event that had not finished, so the chat skipped its handlers. Make sure every ${type} handler settles its Promise and does not wait on a chat call that fires ${type} again, such as addMessage from a receive handler.`
          )
        );
      }, QUEUED_FIRE_TIMEOUT_MS);
    });
    try {
      await Promise.race([previousFire, timedOut]);
    } finally {
      clearTimeout(timer);
    }
    await run();
  }

  /**
   * Calls every handler registered for the event's type, one after another.
   */
  private async runHandlers<T extends BusEvent>(
    busEvent: T,
    instance: ChatInstance
  ) {
    const { type } = busEvent;
    const handlersForType = this.handlersByType.get(type);
    if (!handlersForType?.length) {
      return;
    }
    // Copy the array in case it's modified by an event handler.
    const handlersCopy = handlersForType.slice();
    await asyncForEach(handlersCopy, (handler: EventBusHandler) => {
      const result = handler(busEvent, instance);
      if (result && !(result instanceof Promise)) {
        consoleWarn(
          `An event handler for event ${type} returned a non-promise. This might be a mistake.`,
          result
        );
      }
      return result;
    });
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
    logEvent('Before fire', busEvent);

    const { type } = busEvent;

    // Run all the handlers for the given type.
    const handlersForType = this.handlersByType.get(type);
    if (handlersForType && handlersForType.length) {
      // Copy the array in case it's modified by an event handler.
      const handlersCopy = handlersForType.slice();
      handlersCopy.forEach((handler) => {
        try {
          handler(busEvent, instance);
        } catch (error) {
          consoleError(
            `An event handler for ${type} threw, so the chat ignored the error and continued.`,
            error
          );
        }
      });
    }

    logEvent('After fire', busEvent);
  }

  hasListeners(type: BusEventType) {
    return Boolean(
      this.handlersByType.get(type)?.length ||
      this.handlersByType.get(WILDCARD_EVENT_TYPE)?.length
    );
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
          `Attempted to listen to an event with no type: "${type}"!`
        );
      }

      if (typeof handler === 'function') {
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
      if (typeof handler === 'function') {
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
        consoleLog('Listener', listener);
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

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEvent,
  BusEventType,
  EventHandlers,
  TypeAndHandler,
} from '../../../src/aiChatEntry';

/** Every event type a host can subscribe to. */
export const ALL_EVENT_TYPES = Object.values(BusEventType) as BusEventType[];

/** A record of the events a chat fired, in order. */
export interface EventRecorder {
  /** Every event so far, oldest first. */
  readonly events: BusEvent[];
  /** The type of every event so far, oldest first. */
  types(): string[];
  /** The types so far, leaving out the ones a test doesn't care about. */
  typesExcept(...ignored: BusEventType[]): string[];
  /** Events of one type. */
  of<T extends BusEvent = BusEvent>(type: BusEventType): T[];
  /** Forgets what was recorded. */
  clear(): void;
  /** Unsubscribes. */
  stop(): void;
}

/**
 * Subscribes to every event type (or the given ones) through the public
 * `on`, and records each event in the order the chat fired it.
 */
export function recordEvents(
  target: EventHandlers,
  types: BusEventType[] = ALL_EVENT_TYPES
): EventRecorder {
  const events: BusEvent[] = [];
  const handlers: TypeAndHandler[] = types.map((type) => ({
    type,
    handler: (event: BusEvent) => {
      events.push(event);
    },
  }));
  target.on(handlers);
  return {
    events,
    types: () => events.map((event) => event.type),
    typesExcept: (...ignored) =>
      events
        .map((event) => event.type)
        .filter((type) => !ignored.includes(type)),
    of: <T extends BusEvent>(type: BusEventType) =>
      events.filter((event) => event.type === type) as T[],
    clear: () => {
      events.length = 0;
    },
    stop: () => {
      target.off(handlers);
    },
  };
}

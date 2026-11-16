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
  ChatInstance,
  EventHandlers,
  TypeAndHandler,
} from '../../../src/aiChatEntry';
import { pause } from './timing';

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

/** Counts `chat:ready` from the first moment a host can subscribe. */
export interface ChatReadyCounter {
  /** Pass this as the mount's `onBeforeRender`. */
  onBeforeRender: (instance: ChatInstance) => void;
  /** How many times `chat:ready` has fired. */
  count(): number;
}

/**
 * Subscribes to `chat:ready` in `onBeforeRender`, before the chat can fire
 * it, and counts each event.
 */
export function countChatReady(): ChatReadyCounter {
  let count = 0;
  return {
    onBeforeRender: (instance) => {
      instance.on({
        type: BusEventType.CHAT_READY,
        handler: () => {
          count += 1;
        },
      });
    },
    count: () => count,
  };
}

/** Checks what the chat logs when a host's event handler throws. */
export interface HandlerErrorLog {
  /** Starts recording `console.error`. Call it after mounting. */
  watch(): void;
  /** Waits a moment, then expects the chat to have logged `error` for `type`. */
  expectLogged(type: BusEventType, error: Error): Promise<void>;
}

/**
 * Spies on `console.error` for tests that register a throwing handler, and
 * restores it after each test. Jest fails a test whose promise rejection goes
 * unhandled, so a passing test also shows the chat caught the error.
 */
export function handlerErrorLog(): HandlerErrorLog {
  let consoleError: jest.SpyInstance | undefined;
  afterEach(() => {
    consoleError?.mockRestore();
    consoleError = undefined;
  });
  return {
    watch() {
      consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      consoleError.mockClear();
    },
    async expectLogged(type, error) {
      await pause();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(`"${type}"`),
        error
      );
    },
  };
}

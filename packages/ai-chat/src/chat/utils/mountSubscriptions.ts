/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { EventBus } from '../../sdk/events/EventBus';
import { asArray } from '../../sdk/utils/lang/arrayUtils';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type { TypeAndHandler } from '../../types/instance/EventHandlers';

/** Removes the listeners each mount added to its chat. */
const drops = new WeakMap<ChatInstance, () => void>();
const released = new WeakSet<ChatInstance>();

/** Tracks one mount's listeners while a reused chat outlives that mount. */
function mountSubscriptions(
  eventBus: EventBus,
  state: ChatInstance['state'],
  self: () => ChatInstance
) {
  const own = new Set<TypeAndHandler>();
  const unsubscribes = new Set<() => void>();
  const record = () =>
    drops.set(self(), () => {
      eventBus.off([...own]);
      own.clear();
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      unsubscribes.clear();
    });
  const track = (subscribe: () => () => void) => {
    if (released.has(self())) {
      return () => {};
    }
    record();
    const unsubscribe = subscribe();
    unsubscribes.add(unsubscribe);
    return () => {
      unsubscribes.delete(unsubscribe);
      unsubscribe();
    };
  };
  const mountedState: ChatInstance['state'] = {
    get: state.get,
    subscribe: (listener) => track(() => state.subscribe(listener)),
    select: (selector, listener, options) =>
      track(() => state.select(selector, listener, options)),
  };
  return {
    state: mountedState,
    on: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      if (released.has(self())) {
        return self();
      }
      record();
      asArray(handlers).forEach((entry) => {
        eventBus.on(entry);
        if (typeof entry.handler === 'function') {
          own.add({ type: entry.type, handler: entry.handler });
        }
      });
      return self();
    },

    once: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      if (released.has(self())) {
        return self();
      }
      record();
      asArray(handlers).forEach(({ type, handler }) => {
        if (typeof handler !== 'function') {
          // The bus reports it.
          eventBus.once({ type, handler });
          return;
        }
        // The bus's own `once`, with the wrapper recorded so a drop finds it.
        const entry: TypeAndHandler = {
          type,
          handler: (event, instance) => {
            eventBus.off(entry);
            own.delete(entry);
            return handler(event, instance);
          },
        };
        own.add(entry);
        eventBus.on(entry);
      });
      return self();
    },

    off: (handlers: TypeAndHandler | TypeAndHandler[]) => {
      eventBus.off(handlers);
      asArray(handlers).forEach(({ type, handler }) => {
        // As on the bus: no handler removes every handler of the type, and a
        // handler removes one of its copies.
        for (const entry of own) {
          if (entry.type === type && (!handler || entry.handler === handler)) {
            own.delete(entry);
            if (handler) {
              break;
            }
          }
        }
      });
      return self();
    },
  };
}

/**
 * Removes event and state listeners added through a released mount's instance.
 * Listeners added through another mount's instance stay.
 */
function dropSubscriptions(instance: ChatInstance | undefined) {
  if (instance) {
    released.add(instance);
    drops.get(instance)?.();
  }
}

export { dropSubscriptions, mountSubscriptions };

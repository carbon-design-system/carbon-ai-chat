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

/** Removes what each mount's instance added to its chat's event bus. */
const drops = new WeakMap<ChatInstance, () => void>();

/**
 * The `on`, `once`, and `off` of one mount's {@link ChatInstance}. They act on
 * the chat's event bus as before, and record what they add, so
 * {@link dropSubscriptions} can remove it when a reused chat outlives the
 * mount.
 */
function mountSubscriptions(eventBus: EventBus, self: () => ChatInstance) {
  const own = new Set<TypeAndHandler>();
  const record = () =>
    drops.set(self(), () => {
      eventBus.off([...own]);
      own.clear();
    });
  return {
    on: (handlers: TypeAndHandler | TypeAndHandler[]) => {
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
        own.forEach((entry) => {
          // No handler removes every handler of the type, as on the bus.
          if (entry.type === type && (!handler || entry.handler === handler)) {
            own.delete(entry);
          }
        });
      });
      return self();
    },
  };
}

/**
 * Removes every handler added through a mount's instance, once that mount is
 * gone and its chat keeps running for the next one. Handlers added through
 * another mount's instance stay.
 */
function dropSubscriptions(instance: ChatInstance | undefined) {
  if (instance) {
    drops.get(instance)?.();
  }
}

export { dropSubscriptions, mountSubscriptions };

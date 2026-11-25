/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../../services/ServiceManager';
import { slotSource, type SlotSource } from '../../services/slotTracking';

/**
 * A slot source for an `ExtensionHosts` built outside a chat: the tracking
 * listens on `events`, the instance or event bus the spec fires through.
 */
export function slotSourceOf(events: unknown): SlotSource {
  const eventBus =
    events && typeof (events as { on?: unknown }).on === 'function'
      ? events
      : { on: (): void => undefined };
  return slotSource({ eventBus } as unknown as ServiceManager);
}

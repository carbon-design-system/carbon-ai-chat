/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { BusEvent } from '../../types/events/eventBusTypes';
import { consoleError } from '../utils/miscUtils';
import type { ServiceManager } from './ServiceManager';

/**
 * Fires an event the user set off, such as a feedback click, or one the view fires as it draws, such as a custom
 * panel finishing its open. No host call is waiting on it, so a handler's error is logged here rather than left as an
 * unhandled rejection.
 */
async function fireUserEvent<T extends BusEvent>(
  serviceManager: Pick<ServiceManager, 'fire'>,
  busEvent: T
): Promise<void> {
  try {
    await serviceManager.fire(busEvent);
  } catch (error) {
    consoleError(
      `An event handler for "${busEvent.type}" threw, so the chat skipped the later handlers and continued.`,
      error
    );
  }
}

export { fireUserEvent };

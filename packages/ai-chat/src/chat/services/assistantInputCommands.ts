/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from '../store/actions';
import { BusEventType } from '../../types/events/eventBusTypes';
import { consoleError } from '../utils/miscUtils';
import type { ServiceManager } from './ServiceManager';

async function requestStopFromInput(
  serviceManager: ServiceManager,
  markPending: () => void
): Promise<void> {
  const { store } = serviceManager;
  // Pending UI can flush host effects; capture visibility before calling it.
  const chatShowsButton =
    store.getState().assistantInputState.stopStreamingButtonState.isVisible;
  markPending();
  if (chatShowsButton) {
    store.dispatch(actions.setStopStreamingButtonDisabled(true));
  }
  try {
    await serviceManager.fire({ type: BusEventType.STOP_STREAMING });
    if (chatShowsButton) {
      await serviceManager.messageService.cancelCurrentMessageRequest();
    }
  } catch (error) {
    consoleError('Error stopping stream:', error);
    store.dispatch(actions.setStopStreamingButtonDisabled(false));
  }
}

export { requestStopFromInput };

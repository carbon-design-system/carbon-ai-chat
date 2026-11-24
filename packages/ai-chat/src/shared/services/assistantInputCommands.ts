/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from './ServiceManager';

function requestStopFromInput(
  serviceManager: ServiceManager,
  markPending: () => void
): Promise<void> {
  return serviceManager.messageCoordinator.requestStopFromInput(markPending);
}

export { requestStopFromInput };

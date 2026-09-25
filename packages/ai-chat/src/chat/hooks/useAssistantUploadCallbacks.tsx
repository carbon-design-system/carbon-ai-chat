/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from 'react';
import type { ServiceManager } from '../services/ServiceManager';
import { createAssistantUploadCallbacks } from '../utils/assistantUploadCallbacks';

export function useAssistantUploadCallbacks({
  serviceManager,
}: {
  serviceManager: ServiceManager;
}) {
  return useMemo(
    () => createAssistantUploadCallbacks(serviceManager),
    [serviceManager]
  );
}

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback } from 'react';
import {
  updateHistoryMobileDetection,
  type HistoryMobileDetectionOptions,
} from '../utils/historyMobileDetection';

export function useHistoryMobileDetection({
  container,
  useCustomHostElement,
  serviceManager,
}: HistoryMobileDetectionOptions) {
  return useCallback(
    (width: number) =>
      updateHistoryMobileDetection(
        {
          container,
          useCustomHostElement,
          serviceManager,
        },
        width
      ),
    [container, useCustomHostElement, serviceManager]
  );
}

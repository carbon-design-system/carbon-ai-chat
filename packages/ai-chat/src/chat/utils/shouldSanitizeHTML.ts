/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';

export function selectShouldSanitizeHTML(state: AppState): boolean {
  return Boolean(state.config.public.shouldSanitizeHTML);
}

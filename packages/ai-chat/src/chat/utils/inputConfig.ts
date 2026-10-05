/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { AppState } from '../../types/state/AppState';

export function selectInputConfig(state: AppState) {
  const input = state.config.public.input;
  return {
    mention: input?.mention,
    command: input?.command,
    autocomplete: input?.autocomplete,
    starters: input?.starters,
    hostExtensions: input?.tiptap?.extensions,
    isSendDisabledFromConfig: Boolean(input?.isSendDisabled),
    actions: input?.actions,
    expanded: Boolean(input?.expanded),
  };
}

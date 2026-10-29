/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from 'react';
import {
  transformStarterItems,
  transformSuggestionConfig,
} from '@carbon/ai-chat-components/es/react/utils/transformSuggestionConfig.js';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import { useInputConfig } from './useInputConfig';

export function useNativeInputConfig() {
  const { mention, command, autocomplete, starters, actions } =
    useInputConfig();
  const normalizedMention = useMemo(
    () => transformSuggestionConfig(mention),
    [mention]
  );
  const normalizedCommand = useMemo(
    () => transformSuggestionConfig(command),
    [command]
  );
  const normalizedAutocomplete = useMemo(
    () => transformSuggestionConfig(autocomplete),
    [autocomplete]
  );
  const normalizedStarters = useMemo(
    () => transformStarterItems(starters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only consumed starter fields invalidate normalization
    [
      starters?.items,
      starters?.renderCustomList,
      starters?.isOn,
      starters?.disableDirectSend,
    ]
  );
  const normalizedActions = useMemo(
    () =>
      actions?.map((action) => ({
        ...action,
        icon: transformReactIconToCarbonIcon(action.icon, 16),
      })),
    [actions]
  );

  return {
    mention: normalizedMention,
    command: normalizedCommand,
    autocomplete: normalizedAutocomplete,
    starters: normalizedStarters,
    inputActions: normalizedActions,
  };
}

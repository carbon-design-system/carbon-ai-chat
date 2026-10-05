/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useMemo, useState } from 'react';
import {
  transformStarterItems,
  transformSuggestionConfig,
} from '@carbon/ai-chat-components/es/react/utils/transformSuggestionConfig.js';
import type { Extension } from '@tiptap/core';
import type {
  TriggerSuggestionConfig,
  AutocompleteConfig,
  StartersConfig,
} from '../../types/config/InputConfig';
import {
  InputExtensions,
  buildInputExtensions,
} from '../services/inputExtensions';

interface UseInputExtensionsArgs {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: StartersConfig | undefined;
  hostExtensions: Extension[] | undefined;
  /**
   * Whether the rich editor is active. The curated carbon extensions (and the
   * `@tiptap/*` they pull) are only built when `true`, so the lightweight
   * textarea path never downloads Tiptap. Host `tiptap.extensions` are included
   * regardless of this flag — they need no chunk — so whichever surface mounts
   * has them installed. (Configured host extensions also force `enabled` true
   * via `resolvePromptLineMode`, so they normally mount the rich editor.)
   */
  enabled: boolean;
}

/**
 * Normalizes the suggestion/starter configs (converts React icon components
 * into CarbonIcon descriptors) and, only when `enabled`, assembles the curated
 * Tiptap extension bundle via the lazily-loaded `buildCarbonExtensions`. The
 * normalized configs are returned alongside `extensions` because they are also
 * threaded into `useChatAutocomplete` for the overlay (and are Tiptap-free, so
 * they stay on the default path).
 */
function useInputExtensions({
  mention,
  command,
  autocomplete,
  starters,
  hostExtensions,
  enabled,
}: UseInputExtensionsArgs) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- starters object identity is intentionally excluded; only the consumed fields matter
    [
      starters?.items,
      starters?.renderCustomList,
      starters?.isOn,
      starters?.disableDirectSend,
    ]
  );

  const controller = useMemo(() => new InputExtensions(), []);
  const [, setLoadTick] = useState(0);
  useEffect(() => {
    controller.connect(enabled, () => setLoadTick((tick) => tick + 1));
    return controller.disconnect;
  }, [controller, enabled]);
  const builder = controller.getBuilder(enabled);
  const extensions = useMemo(
    () =>
      buildInputExtensions(
        {
          mention: normalizedMention,
          command: normalizedCommand,
          autocomplete: normalizedAutocomplete,
          starters: normalizedStarters,
        },
        hostExtensions,
        builder
      ),
    [
      builder,
      normalizedMention,
      normalizedCommand,
      normalizedAutocomplete,
      normalizedStarters,
      hostExtensions,
    ]
  );

  return {
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    extensions,
  };
}

export { useInputExtensions };

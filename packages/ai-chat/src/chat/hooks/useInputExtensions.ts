/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from "react";
import { buildCarbonExtensions } from "@carbon/ai-chat-components/es/components/input/index.js";
import {
  transformStarterItems,
  transformSuggestionConfig,
} from "@carbon/ai-chat-components/es/react/utils/transformSuggestionConfig.js";
import type { Extension } from "@tiptap/core";
import type {
  TriggerSuggestionConfig,
  SuggestionItem,
  AutocompleteConfig,
} from "../../types/config/InputConfig";

interface UseInputExtensionsArgs {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: SuggestionItem[] | undefined;
  hostExtensions: Extension[] | undefined;
}

/**
 * Normalizes the suggestion/starter configs (converts React icon components
 * into CarbonIcon descriptors) and assembles the curated Tiptap extension
 * bundle. The normalized configs are returned alongside `extensions` because
 * they are also threaded into `useChatAutocomplete` for the overlay.
 */
function useInputExtensions({
  mention,
  command,
  autocomplete,
  starters,
  hostExtensions,
}: UseInputExtensionsArgs) {
  const normalizedMention = useMemo(
    () => transformSuggestionConfig(mention),
    [mention],
  );
  const normalizedCommand = useMemo(
    () => transformSuggestionConfig(command),
    [command],
  );
  const normalizedAutocomplete = useMemo(
    () => transformSuggestionConfig(autocomplete),
    [autocomplete],
  );
  const normalizedStarters = useMemo(
    () => transformStarterItems(starters),
    [starters],
  );

  const extensions = useMemo<Extension[]>(
    () => [
      ...buildCarbonExtensions({
        mention: normalizedMention,
        command: normalizedCommand,
        autocomplete: normalizedAutocomplete,
        starters: normalizedStarters,
      }),
      ...(hostExtensions ?? []),
    ],
    [
      normalizedMention,
      normalizedCommand,
      normalizedAutocomplete,
      normalizedStarters,
      hostExtensions,
    ],
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

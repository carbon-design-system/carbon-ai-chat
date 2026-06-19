/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useMemo, useState } from "react";
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
import {
  getBuildCarbonExtensionsIfLoaded,
  loadBuildCarbonExtensions,
} from "../components/input/buildExtensionsLoader";

interface UseInputExtensionsArgs {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: SuggestionItem[] | undefined;
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

// Stable empty reference so a disabled/not-yet-loaded build doesn't hand the
// prompt-line a fresh array each render (which would recreate the editor).
const EMPTY_EXTENSIONS: Extension[] = [];

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

  // Re-render once the builder chunk resolves (cold rich path); the synchronous
  // cache lets the warm path (boot-preloaded) build on first render.
  const [, setLoadTick] = useState(0);
  useEffect(() => {
    if (enabled && !getBuildCarbonExtensionsIfLoaded()) {
      let active = true;
      void loadBuildCarbonExtensions().then(() => {
        if (active) {
          setLoadTick((tick) => tick + 1);
        }
      });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [enabled]);

  const buildCarbonExtensions = enabled
    ? getBuildCarbonExtensionsIfLoaded()
    : null;

  const extensions = useMemo<Extension[]>(() => {
    // The curated carbon bundle (mention / command / autocomplete / starters)
    // pulls Tiptap, so it is only built when `enabled`. Host extensions need no
    // chunk, so they are always staged onto the prompt-line — even in textarea
    // mode — so a later on-demand upgrade mounts with them already installed.
    const carbon = buildCarbonExtensions
      ? buildCarbonExtensions({
          mention: normalizedMention,
          command: normalizedCommand,
          autocomplete: normalizedAutocomplete,
          starters: normalizedStarters,
        })
      : [];
    const host = hostExtensions ?? [];
    if (carbon.length === 0) {
      // No carbon bundle: return a stable reference (the host array, or the
      // shared empty) so a `buildCarbonExtensions` load that yields nothing —
      // e.g. an extensions-only chat, whose curated bundle is empty — does not
      // churn the prompt-line's `extensions` prop and needlessly recreate the
      // live editor (which would drop its content).
      return host.length === 0 ? EMPTY_EXTENSIONS : host;
    }
    return [...carbon, ...host];
  }, [
    buildCarbonExtensions,
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    hostExtensions,
  ]);

  return {
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    extensions,
  };
}

export { useInputExtensions };

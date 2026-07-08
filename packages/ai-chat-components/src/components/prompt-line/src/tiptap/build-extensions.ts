/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Pure helper: translate the chat-domain configs surfaced on
 * `<cds-aichat-prompt-line-shell>` (and `InputConfig`) into a curated Tiptap
 * extension list. Used by the shell's render logic and exposed publicly so
 * direct `<cds-aichat-prompt-line>` consumers can call the same builder
 * without bringing the chrome along.
 *
 * Filters out `undefined` / empty configs so the returned list contains
 * exactly the extensions whose backing config was supplied. Enter-to-send is
 * **not** included here — `<cds-aichat-prompt-line>` bakes `carbonChatEnter`
 * into its own base bundle, so both the textarea and rich surfaces send on
 * Enter without this builder.
 */

import type { Extension } from "@tiptap/core";

import { carbonAutocomplete } from "./carbon-autocomplete.js";
import { carbonCommand, carbonMention } from "./carbon-mention.js";
import { carbonStarterTrigger } from "./carbon-starter-trigger.js";
import type {
  AutocompleteConfig,
  SuggestionItem,
  TriggerSuggestionConfig,
} from "./types.js";

export interface BuildCarbonExtensionsConfig {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: SuggestionItem[];
}

export function buildCarbonExtensions(
  configs: BuildCarbonExtensionsConfig,
): Extension[] {
  const out: Extension[] = [];
  if (configs.mention) {
    out.push(carbonMention(configs.mention) as unknown as Extension);
  }
  if (configs.command) {
    out.push(carbonCommand(configs.command) as unknown as Extension);
  }
  if (configs.autocomplete) {
    out.push(carbonAutocomplete(configs.autocomplete));
  }
  if (configs.starters && configs.starters.length > 0) {
    out.push(carbonStarterTrigger(configs.starters));
  }
  return out;
}

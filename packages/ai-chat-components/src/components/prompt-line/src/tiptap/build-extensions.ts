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

import type { Extension } from '@tiptap/core';

import {
  carbonAutocomplete,
  type ExcludedTrigger,
} from './carbon-autocomplete.js';
import { carbonCommand, carbonMention } from './carbon-mention.js';
import { carbonStarterTrigger } from './carbon-starter-trigger.js';
import { tagExtensionSource } from './extension-equivalence.js';
import type {
  AutocompleteConfig,
  StartersConfig,
  TriggerSuggestionConfig,
} from './types.js';

export interface BuildCarbonExtensionsConfig {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: StartersConfig;
}

export function buildCarbonExtensions(
  configs: BuildCarbonExtensionsConfig
): Extension[] {
  // Each entry is tagged with the config it was built from so the rich runtime
  // can tell a genuinely different extension set from a rebuilt-but-identical
  // one without recreating the editor. See ./extension-equivalence.ts.
  const out: Extension[] = [];
  if (configs.mention) {
    out.push(
      tagExtensionSource(
        carbonMention(configs.mention) as unknown as Extension,
        {
          kind: 'mention',
          config: configs.mention,
        }
      )
    );
  }
  if (configs.command) {
    out.push(
      tagExtensionSource(
        carbonCommand(configs.command) as unknown as Extension,
        {
          kind: 'command',
          config: configs.command,
        }
      )
    );
  }
  if (configs.autocomplete) {
    const excludeTriggers: ExcludedTrigger[] = [];
    if (configs.mention) {
      excludeTriggers.push({
        char: configs.mention.trigger,
        position:
          configs.mention.triggerPosition === 'start' ? 'start' : 'anywhere',
      });
    }
    if (configs.command) {
      excludeTriggers.push({
        char: configs.command.trigger,
        position:
          configs.command.triggerPosition === 'start' ? 'start' : 'anywhere',
      });
    }
    out.push(
      tagExtensionSource(
        carbonAutocomplete(configs.autocomplete, excludeTriggers),
        {
          kind: 'autocomplete',
          config: configs.autocomplete,
        }
      )
    );
  }
  // Installed whenever `starters` is configured, empty list included: it is how
  // `items`/`isOn` reach the live editor, and omitting it for an empty list
  // shortens the set, which the equivalence check rejects — recreating the
  // editor and dropping its undo history. `maybeEmit` stays silent when empty.
  if (configs.starters) {
    out.push(
      tagExtensionSource(
        carbonStarterTrigger(configs.starters.items, configs.starters.isOn),
        { kind: 'starters', config: configs.starters }
      )
    );
  }
  return out;
}

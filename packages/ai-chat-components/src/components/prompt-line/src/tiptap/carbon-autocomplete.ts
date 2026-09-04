/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `carbonAutocomplete` factory. Wraps `@tiptap/suggestion` directly (no
 * Mention node). Activates whenever the input has any non-empty text (the
 * legacy autocomplete contract).
 *
 * Dispatches `cds-aichat-trigger-change` with `type: "autocomplete"` from
 * the suggestion-render lifecycle via the shared `dispatchTriggerChange`
 * helper. Selection is routed through `AutocompleteController.select()` —
 * the `@tiptap/suggestion` `command` hook is intentionally unused.
 */

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

import { dispatchTriggerChange } from './trigger-utils.js';
import type { AutocompleteConfig, SuggestionItem } from './types.js';

/**
 * A trigger character that autocomplete stands down for, so a co-installed
 * mention or command picker wins while its trigger is active. Pass a list of
 * these as the second argument to {@link carbonAutocomplete}.
 */
export interface ExcludedTrigger {
  /** The character to stand down for, such as `"@"` or `"/"`. */
  char: string;
  /**
   * Where that character has to sit. `"anywhere"` stands down for any word
   * starting with it; `"start"` stands down only when that word starts the
   * line. Mirrors the picker's own
   * {@link TriggerSuggestionConfig.triggerPosition}.
   */
  position: 'anywhere' | 'start';
}

// `_config` is unused: AutocompleteController owns item resolution and
// insertion. Kept so the exported signature holds for callers already
// passing a config.
export function carbonAutocomplete(
  _config: AutocompleteConfig,
  excludeTriggers: ExcludedTrigger[] = []
): Extension {
  const pluginKey = new PluginKey('carbonAutocompleteSuggestion');

  return Extension.create({
    name: 'carbonAutocomplete',

    addProseMirrorPlugins() {
      const editor = this.editor;
      let lastQuery: string | null = null;

      return [
        Suggestion<SuggestionItem>({
          editor,
          char: '',
          pluginKey,
          // Match any non-empty text as the autocomplete query.
          allowedPrefixes: null,
          findSuggestionMatch: ({ $position }) => {
            const text = $position.parent.textBetween(
              0,
              $position.parentOffset,
              '\n',
              '\0'
            );
            if (!text || text.length === 0) {
              return null;
            }
            // Restrict the query to the trailing word (split on whitespace).
            const trailing = /\S+$/.exec(text);
            if (!trailing) {
              return null;
            }
            const query = trailing[0];
            // Yield to co-installed mention/command extensions so they win
            // when their trigger char is active.
            for (const excluded of excludeTriggers) {
              if (!query.startsWith(excluded.char)) {
                continue;
              }
              if (excluded.position === 'anywhere') {
                return null;
              }
              if (text === query) {
                return null;
              }
            }
            const matchStart =
              $position.start() + $position.parentOffset - query.length;
            return {
              range: {
                from: matchStart,
                to: $position.start() + $position.parentOffset,
              },
              query,
              text: query,
            };
          },
          render: () => ({
            onStart: (props) => {
              lastQuery = props.query;
              dispatchTriggerChange(props.editor, {
                type: 'autocomplete',
                query: props.query,
                triggerOffset: props.range.from,
              });
            },
            onUpdate: (props) => {
              if (props.query === lastQuery) {
                return;
              }
              lastQuery = props.query;
              dispatchTriggerChange(props.editor, {
                type: 'autocomplete',
                query: props.query,
                triggerOffset: props.range.from,
              });
            },
            onExit: (props) => {
              lastQuery = null;
              dispatchTriggerChange(props.editor, null);
            },
            onKeyDown: () => false,
          }),
        }),
      ];
    },
  });
}

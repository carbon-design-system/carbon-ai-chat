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
 * Mention node) — the `command` callback inserts plain text rather than a
 * schema node. Activates whenever the input has any non-empty text (the
 * legacy autocomplete contract).
 *
 * Dispatches `cds-aichat-trigger-change` with `type: "autocomplete"` from
 * the suggestion-render lifecycle via the shared `dispatchTriggerChange`
 * helper.
 */

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";

import { dispatchTriggerChange } from "./trigger-utils.js";
import type { AutocompleteConfig, SuggestionItem } from "./types.js";

export function carbonAutocomplete(config: AutocompleteConfig): Extension {
  const name = config.name ?? "autocomplete";
  const pluginKey = new PluginKey(`carbonAutocompleteSuggestion_${name}`);

  return Extension.create({
    name: `carbon${capitalize(name)}`,

    addProseMirrorPlugins() {
      const editor = this.editor;
      let lastQuery: string | null = null;

      return [
        Suggestion<SuggestionItem>({
          editor,
          char: "",
          pluginKey,
          // Match any non-empty text as the autocomplete query.
          allowedPrefixes: null,
          findSuggestionMatch: ({ $position }) => {
            const text = $position.parent.textBetween(
              0,
              $position.parentOffset,
              "\n",
              "\0",
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
          items: ({ query }) => resolveItems(config, query),
          command: ({ editor: ed, range, props }) => {
            const item = props as SuggestionItem;
            const insertText = item.value ?? item.label;
            ed.chain()
              .focus()
              .insertContentAt(range, [
                { type: "text", text: insertText },
                { type: "text", text: " " },
              ])
              .run();
            config.onSelect?.(item);
          },
          render: () => ({
            onStart: (props) => {
              lastQuery = props.query;
              dispatchTriggerChange(props.editor, {
                type: "autocomplete",
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
                type: "autocomplete",
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

async function resolveItems(
  config: AutocompleteConfig,
  query: string,
): Promise<SuggestionItem[]> {
  const minQueryLength = config.minQueryLength ?? 0;
  if (query.length < minQueryLength) {
    return [];
  }
  if (typeof config.items === "function") {
    return Promise.resolve(config.items(query));
  }
  if (!query) {
    return config.items;
  }
  const lower = query.toLowerCase();
  return config.items.filter((item) =>
    item.label.toLowerCase().includes(lower),
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `carbonMention` and `carbonCommand` factories. Both wrap
 * `@tiptap/extension-mention` with carbon-specific:
 * - chip rendering via `CarbonTokenNodeView` (uses the light-DOM portal
 *   handshake so React portal consumers render in light DOM).
 * - extra schema attrs (`value`, `data`) layered on top of Mention's default
 *   `id` + `label`.
 * - direct `cds-aichat-trigger-change` dispatch from the suggestion-render
 *   lifecycle via the shared `dispatchTriggerChange` helper.
 *
 * They share an internal builder. The two exports differ only in their
 * default schema-node name (`"mention"` vs `"command"`), the dispatched
 * trigger type, and the default chip color (handled inside the NodeView).
 * Hosts compose multiple instances cleanly by passing distinct `name`
 * values — the factory threads the name through `Mention.extend({ name })`
 * to sidestep the [Tiptap stacking caveat](https://github.com/ueberdosis/tiptap/issues/2219).
 */

import type { Editor, Range } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";

import { CarbonTokenNodeView } from "./token-node-view.js";
import { dispatchTriggerChange } from "./trigger-utils.js";
import type { SuggestionItem, TriggerSuggestionConfig } from "./types.js";

interface BuildOptions {
  defaultName: "mention" | "command";
  defaultPluginKeyName: string;
}

function buildTriggerExtension(
  config: TriggerSuggestionConfig,
  build: BuildOptions,
) {
  const name = config.name ?? build.defaultName;
  const pluginKey = new PluginKey(`${build.defaultPluginKeyName}_${name}`);

  return Mention.extend({
    name,

    addAttributes() {
      const parent = (this.parent?.() ?? {}) as Record<string, unknown>;
      return {
        ...parent,
        value: { default: null },
        data: { default: null },
      };
    },

    addNodeView() {
      return ({ node, editor }) =>
        new CarbonTokenNodeView(node, editor.view, {
          renderCustomToken: config.renderCustomToken,
        });
    },
  }).configure({
    HTMLAttributes: { "data-token-type": name },
    suggestion: {
      char: config.trigger,
      pluginKey,
      startOfLine: config.triggerPosition === "start",
      items: ({ query }) => resolveItems(config, query),
      command: ({ editor, range, props }) => {
        const item = props as SuggestionItem;
        // Insert the mention/command node with our extended attrs.
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: name,
              attrs: {
                id: item.id,
                label: item.label,
                value: item.value ?? item.label,
                data: stripPresentationFields(item),
              },
            },
            { type: "text", text: " " },
          ])
          .run();
        config.onSelect?.(item);
      },
      render: () => {
        let lastQuery: string | null = null;
        return {
          onStart: (props) =>
            emitTrigger(props.editor, name, props.query, props.range, () => {
              lastQuery = props.query;
            }),
          onUpdate: (props) => {
            if (props.query === lastQuery) {
              return;
            }
            lastQuery = props.query;
            emitTrigger(props.editor, name, props.query, props.range);
          },
          onExit: (props) => {
            lastQuery = null;
            dispatchTriggerChange(props.editor, null);
          },
          onKeyDown: () => false,
        };
      },
    },
  });
}

function emitTrigger(
  editor: Editor,
  type: string,
  query: string,
  range: Range,
  postEmit?: () => void,
): void {
  dispatchTriggerChange(editor, {
    type,
    query,
    triggerOffset: range.from,
  });
  postEmit?.();
}

async function resolveItems(
  config: TriggerSuggestionConfig,
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

function stripPresentationFields(
  item: SuggestionItem,
): Record<string, unknown> {
  const {
    id: _id,
    label: _label,
    value: _value,
    icon: _icon,
    avatar: _avatar,
    description: _description,
    disabled: _disabled,
    ...rest
  } = item;
  void _id;
  void _label;
  void _value;
  void _icon;
  void _avatar;
  void _description;
  void _disabled;
  return rest;
}

export function carbonMention(config: TriggerSuggestionConfig) {
  return buildTriggerExtension(config, {
    defaultName: "mention",
    defaultPluginKeyName: "carbonMentionSuggestion",
  });
}

export function carbonCommand(config: TriggerSuggestionConfig) {
  return buildTriggerExtension(config, {
    defaultName: "command",
    defaultPluginKeyName: "carbonCommandSuggestion",
  });
}

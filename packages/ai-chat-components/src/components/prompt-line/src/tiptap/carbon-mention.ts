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
 * - extra schema attrs (`value`, `data`, `trigger`) layered on top of
 *   Mention's default `id` + `label`.
 * - direct `cds-aichat-trigger-change` dispatch from the suggestion-render
 *   lifecycle via the shared `dispatchTriggerChange` helper.
 * - an `onRemove` callback fired when a user edit deletes a token node, the
 *   mirror of the suggestion `onSelect` (see the removal ProseMirror plugin).
 *
 * They share an internal builder. The two exports differ only in their
 * default schema-node name (`"mention"` vs `"command"`), the dispatched
 * trigger type, the default chip color (handled inside the NodeView), and
 * the default for whether the trigger char is stored on inserted nodes —
 * `carbonCommand` defaults to on, `carbonMention` to off, so command chips
 * default to reading as `/summarize` while mention chips stay a bare name.
 * Either default can be overridden per-config (`TriggerSuggestionConfig.
 * showTriggerInChip`) or per-item (`SuggestionItem.showTriggerInChip`, which
 * wins when set — e.g. a single `@` picker mixing people and agents).
 * Hosts compose multiple instances cleanly by passing distinct `name`
 * values — the factory threads the name through `Mention.extend({ name })`
 * to sidestep the [Tiptap stacking caveat](https://github.com/ueberdosis/tiptap/issues/2219).
 */

import type { Editor, Range } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isHostOrigin } from "./origin-meta.js";
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
        trigger: { default: null },
      };
    },

    addNodeView() {
      return ({ node, editor }) =>
        new CarbonTokenNodeView(node, editor.view, {
          renderCustomToken: config.renderCustomToken,
        });
    },

    addProseMirrorPlugins() {
      const parentPlugins = this.parent?.() ?? [];
      const onRemove = config.onRemove;
      if (!onRemove) {
        return parentPlugins;
      }

      // Fire `onRemove` once per token node of this type that leaves the doc
      // via a USER edit. Mirrors the value-sync extension's origin model:
      // `appendTransaction` records whether the batch was host-origin, and the
      // view's `update` runs the diff (after state is applied, so host
      // callbacks never re-enter `dispatch`). Host-origin batches — the
      // framework's post-send clear and any `getEditor()`/`updateContent`
      // mutation — are skipped, symmetric with `onSelect` firing only on user
      // popup selection.
      let lastBatchIsHost = false;

      const removalPlugin = new Plugin({
        key: new PluginKey(`${name}_removal`),
        appendTransaction(transactions) {
          lastBatchIsHost = transactions.some((tr) => isHostOrigin(tr));
          return null;
        },
        view: () => ({
          update(view, prevState) {
            if (view.state.doc === prevState.doc || lastBatchIsHost) {
              return;
            }
            const removed = diffRemovedTokens(
              prevState.doc,
              view.state.doc,
              name,
            );
            for (const item of removed) {
              onRemove(item);
            }
          },
        }),
      });

      return [...parentPlugins, removalPlugin];
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
                // Item overrides config overrides the command/mention
                // default (see resolveShowTriggerInChip).
                trigger: resolveShowTriggerInChip(
                  item,
                  config,
                  build.defaultName === "command",
                )
                  ? config.trigger
                  : null,
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

/**
 * Collect the attrs of every node named `name` in `doc`, grouped by id and
 * kept in document order, so a multiset diff can tell which specific node
 * instances were removed (duplicate chips with the same id are tracked by
 * count, not collapsed).
 */
function collectTokenAttrsById(
  doc: PMNode,
  name: string,
): Map<string, Record<string, unknown>[]> {
  const byId = new Map<string, Record<string, unknown>[]>();
  doc.descendants((node) => {
    if (node.type.name !== name) {
      return;
    }
    const attrs = node.attrs as Record<string, unknown>;
    const id = String(attrs.id);
    const bucket = byId.get(id);
    if (bucket) {
      bucket.push(attrs);
    } else {
      byId.set(id, [attrs]);
    }
  });
  return byId;
}

/**
 * Reconstruct a {@link SuggestionItem} from a removed token node's attrs.
 * Presentation-only fields were stripped at insert time, so only `id`,
 * `label`, `value`, and any custom fields stashed in `data` survive.
 */
function attrsToItem(attrs: Record<string, unknown>): SuggestionItem {
  const data = (attrs.data ?? {}) as Record<string, unknown>;
  return {
    ...data,
    id: String(attrs.id),
    label: attrs.label as string,
    value: (attrs.value ?? undefined) as string | undefined,
  };
}

/**
 * Diff token nodes named `name` between `before` and `after`, returning the
 * reconstructed items for each removed node instance (one entry per removed
 * duplicate).
 */
function diffRemovedTokens(
  before: PMNode,
  after: PMNode,
  name: string,
): SuggestionItem[] {
  const beforeById = collectTokenAttrsById(before, name);
  const afterById = collectTokenAttrsById(after, name);
  const removed: SuggestionItem[] = [];
  for (const [id, beforeAttrs] of beforeById) {
    const afterCount = afterById.get(id)?.length ?? 0;
    for (let i = afterCount; i < beforeAttrs.length; i += 1) {
      removed.push(attrsToItem(beforeAttrs[i]));
    }
  }
  return removed;
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

/**
 * Resolve whether a selected item's chip should be prefixed with the
 * trigger character: the item's own {@link SuggestionItem.showTriggerInChip}
 * wins when set, then the config's
 * {@link TriggerSuggestionConfig.showTriggerInChip}, then the
 * command/mention default.
 */
export function resolveShowTriggerInChip(
  item: SuggestionItem,
  config: Pick<TriggerSuggestionConfig, "showTriggerInChip">,
  isCommand: boolean,
): boolean {
  return item.showTriggerInChip ?? config.showTriggerInChip ?? isCommand;
}

function stripPresentationFields(
  item: SuggestionItem,
): Record<string, unknown> {
  const {
    id: _id,
    label: _label,
    value: _value,
    avatar: _avatar,
    description: _description,
    disabled: _disabled,
    showTriggerInChip: _showTriggerInChip,
    ...rest
  } = item;
  void _id;
  void _label;
  void _value;
  void _avatar;
  void _description;
  void _disabled;
  void _showTriggerInChip;
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

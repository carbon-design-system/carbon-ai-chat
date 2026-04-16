/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import type { Node as PMNode } from "prosemirror-model";
import type { SuggestionConfig } from "../types.js";

export interface TriggerPluginState {
  type: string;
  query: string;
  triggerOffset: number;
}

export const triggerPluginKey = new PluginKey<TriggerPluginState | null>(
  "trigger",
);

export interface SuggestionConfigsRef {
  current: SuggestionConfig[];
}

/**
 * Creates a plugin that detects trigger characters at the cursor position
 * and manages suggestion state.
 *
 * When the cursor is positioned after a configured trigger character (e.g.
 * `@`, `/`, or empty string for autocomplete-on-all-text), the plugin
 * activates with the matching config type, query text, and trigger offset.
 *
 * State is dismissed via meta: `tr.setMeta(triggerPluginKey, { dismiss: true })`
 */
export function createTriggerPlugin(
  configsRef: SuggestionConfigsRef,
): Plugin<TriggerPluginState | null> {
  return new Plugin<TriggerPluginState | null>({
    key: triggerPluginKey,

    state: {
      init() {
        return null;
      },

      apply(tr, prevState, _oldState, newState) {
        // Explicit dismiss via meta
        const meta = tr.getMeta(triggerPluginKey);
        if (meta?.dismiss) {
          return null;
        }

        // Only re-evaluate on doc or selection changes
        if (!tr.docChanged && !tr.selectionSet) {
          return prevState;
        }

        return detectTrigger(newState, configsRef.current);
      },
    },

    view() {
      return {
        update(view, prevState) {
          const prev = triggerPluginKey.getState(prevState);
          const curr = triggerPluginKey.getState(view.state);

          if (sameTriggerState(prev, curr)) {
            return;
          }

          view.dom.dispatchEvent(
            new CustomEvent("cds-aichat-trigger-change", {
              detail: curr,
              bubbles: true,
              composed: true,
            }),
          );
        },
      };
    },
  });
}

function sameTriggerState(
  a: TriggerPluginState | null | undefined,
  b: TriggerPluginState | null | undefined,
): boolean {
  if (a == null || b == null) {
    return a == null && b == null;
  }
  return (
    a.type === b.type &&
    a.query === b.query &&
    a.triggerOffset === b.triggerOffset
  );
}

/**
 * Detect if the cursor is in a trigger position relative to any configured
 * suggestion trigger.
 */
function detectTrigger(
  state: EditorState,
  configs: SuggestionConfig[],
): TriggerPluginState | null {
  if (configs.length === 0) {
    return null;
  }

  const { selection } = state;
  if (!selection.empty) {
    return null;
  }

  const { $from } = selection;
  const { textBefore, posMap } = buildTextBefore(
    $from.parent,
    $from.parentOffset,
  );

  for (const config of configs) {
    const match = matchConfig(config, textBefore);
    if (match == null) {
      continue;
    }

    // Translate the text-space trigger index to a real doc offset using posMap
    const blockStartPos = $from.start();
    const triggerParentOffset =
      posMap[match.triggerOffsetInText] ?? match.triggerOffsetInText;

    return {
      type: match.type,
      query: match.query,
      triggerOffset: blockStartPos + triggerParentOffset,
    };
  }

  return null;
}

/**
 * Builds the text content of `parent` up to `offsetInParent`, plus a `posMap`
 * that maps each character index in the returned string back to the
 * parent-relative doc offset.
 *
 * A posMap is needed because token atoms occupy 1 doc offset but their
 * serialized `value` string can be many characters (e.g. `"@John Smith"` is
 * 11 chars but 1 offset). All characters within a token map to the token's
 * start offset so callers can later replace the trigger range correctly.
 *
 * Exported for unit testing.
 */
export function buildTextBefore(
  parent: PMNode,
  offsetInParent: number,
): { textBefore: string; posMap: number[] } {
  let textBefore = "";
  const posMap: number[] = [];
  let pos = 0;

  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    if (pos >= offsetInParent) {
      break;
    }

    if (child.isText) {
      const remaining = offsetInParent - pos;
      const slice = (child.text ?? "").slice(0, remaining);
      for (let c = 0; c < slice.length; c++) {
        posMap.push(pos + c);
      }
      textBefore += slice;
      pos += child.text?.length ?? 0;
    } else if (child.type.name === "token") {
      pos += 1;
      if (pos <= offsetInParent) {
        const value = child.attrs.value as string;
        for (let c = 0; c < value.length; c++) {
          posMap.push(pos - 1);
        }
        textBefore += value;
      }
    } else {
      pos += child.nodeSize;
    }
  }

  return { textBefore, posMap };
}

/**
 * Tests a single suggestion config against the text before the cursor.
 * Returns a match with the resolved type, query, and trigger position within
 * `textBefore`, or null if this config does not match.
 *
 * Handles three cases:
 * - Empty trigger: autocomplete on the whole text.
 * - Char trigger with `triggerPosition: "start"`: only matches when the
 *   trigger is at the start of the line (after optional leading whitespace).
 * - Char trigger with `triggerPosition: "anywhere"` (default): the trigger
 *   must be at the start or preceded by whitespace, and the query after the
 *   trigger must not contain whitespace.
 *
 * Exported for unit testing.
 */
export function matchConfig(
  config: SuggestionConfig,
  textBefore: string,
): { type: string; query: string; triggerOffsetInText: number } | null {
  const type = config.type ?? "autocomplete";
  const trigger = config.trigger;

  if (trigger === "") {
    if (textBefore.length === 0) {
      return null;
    }
    return { type, query: textBefore, triggerOffsetInText: 0 };
  }

  const triggerPos = textBefore.lastIndexOf(trigger);
  if (triggerPos === -1) {
    return null;
  }

  if (config.triggerPosition === "start") {
    const beforeTrigger = textBefore.slice(0, triggerPos);
    if (beforeTrigger.trim().length > 0) {
      return null;
    }
  } else if (triggerPos > 0) {
    const charBefore = textBefore[triggerPos - 1];
    if (!/\s/.test(charBefore)) {
      return null;
    }
  }

  const query = textBefore.slice(triggerPos + trigger.length);
  if (/\s/.test(query)) {
    return null;
  }

  return { type, query, triggerOffsetInText: triggerPos };
}

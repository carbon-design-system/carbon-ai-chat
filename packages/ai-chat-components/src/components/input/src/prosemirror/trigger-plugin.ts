/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import type { Node as PMNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { SuggestionType, type SuggestionConfig } from "../types.js";

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
 * Activates in two ways:
 * - When the cursor is positioned after a configured trigger character (e.g.
 *   `@`, `/`) or any non-empty text (for autocomplete configs), the plugin
 *   reports the matching config type, query text, and trigger offset.
 * - When the input is empty and focused (and editable), and a `STARTER` config
 *   is registered, a synthetic trigger fires with `query: ""` so prompt-seed
 *   ideas can be surfaced before the user has typed anything.
 *
 * State is dismissed via meta: `tr.setMeta(triggerPluginKey, { dismiss: true })`
 */
export function createTriggerPlugin(
  configsRef: SuggestionConfigsRef,
): Plugin<TriggerPluginState | null> {
  let focused = false;
  let editable = true;

  return new Plugin<TriggerPluginState | null>({
    key: triggerPluginKey,

    state: {
      init() {
        return null;
      },

      apply(tr, prevState, _oldState, newState) {
        const meta = tr.getMeta(triggerPluginKey);
        if (meta?.dismiss) {
          return null;
        }

        if (!tr.docChanged && !tr.selectionSet && !meta?.focusChanged) {
          return prevState;
        }

        return detectTrigger(newState, configsRef.current, focused, editable);
      },
    },

    view(view: EditorView) {
      focused = view.hasFocus();
      editable = view.editable;

      const handleFocus = () => {
        focused = true;
        editable = view.editable;
        view.dispatch(
          view.state.tr.setMeta(triggerPluginKey, { focusChanged: true }),
        );
      };
      const handleBlur = () => {
        focused = false;
        view.dispatch(
          view.state.tr.setMeta(triggerPluginKey, { focusChanged: true }),
        );
      };

      view.dom.addEventListener("focus", handleFocus);
      view.dom.addEventListener("blur", handleBlur);

      return {
        update(view, prevState) {
          editable = view.editable;

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
        destroy() {
          view.dom.removeEventListener("focus", handleFocus);
          view.dom.removeEventListener("blur", handleBlur);
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
 * suggestion. Handles the synthetic STARTER case (empty + focused + editable)
 * and falls through to per-config matching for typed triggers.
 *
 * Exported for unit testing.
 */
export function detectTrigger(
  state: EditorState,
  configs: SuggestionConfig[],
  focused: boolean,
  editable: boolean,
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

  // Phase A: synthetic STARTER trigger on empty + focused + editable.
  if (textBefore.length === 0) {
    if (!focused || !editable) {
      return null;
    }
    const hasStarter = configs.some(
      (config) => config.type === SuggestionType.STARTER,
    );
    if (hasStarter) {
      return {
        type: SuggestionType.STARTER,
        query: "",
        triggerOffset: $from.start(),
      };
    }
    return null;
  }

  // Phase B: typed triggers.
  for (const config of configs) {
    const match = matchConfig(config, textBefore);
    if (match == null) {
      continue;
    }

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
 * - STARTER: never matches here; handled by the synthetic-trigger phase.
 * - AUTOCOMPLETE: matches whenever `textBefore` is non-empty.
 * - MENTION / COMMAND: char-trigger logic with optional `triggerPosition`
 *   ("start" requires line start; "anywhere" requires preceding whitespace).
 *   Queries containing whitespace reject.
 *
 * Exported for unit testing.
 */
export function matchConfig(
  config: SuggestionConfig,
  textBefore: string,
): { type: string; query: string; triggerOffsetInText: number } | null {
  switch (config.type) {
    case SuggestionType.STARTER:
      return null;

    case SuggestionType.AUTOCOMPLETE:
      if (textBefore.length === 0) {
        return null;
      }
      return {
        type: SuggestionType.AUTOCOMPLETE,
        query: textBefore,
        triggerOffsetInText: 0,
      };

    case SuggestionType.MENTION:
    case SuggestionType.COMMAND: {
      const trigger = config.trigger;
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

      return { type: config.type, query, triggerOffsetInText: triggerPos };
    }
  }
}

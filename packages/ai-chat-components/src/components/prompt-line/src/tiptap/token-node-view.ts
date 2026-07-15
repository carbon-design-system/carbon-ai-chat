/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `CarbonTokenNodeView` is Tiptap's NodeView for inline tokens (mentions,
 * commands). Via {@link renderTokenChip} it dispatches the light-DOM portal
 * event that consumer-side React portal listeners (`LightDomPortalsContainer`)
 * hydrate into chips.
 *
 * The actual chip-DOM construction (default chip, `renderCustomToken`
 * honoring, and the light-DOM portal handshake) lives in {@link renderTokenChip},
 * which is shared with the chat-side rich user message bubble.
 */

import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView, NodeView } from "@tiptap/pm/view";

import { renderTokenChip, type TokenChipAttrs } from "./render-token-chip.js";
import type { TriggerSuggestionConfig } from "./types.js";

export interface CarbonTokenNodeViewOptions {
  /**
   * Custom renderer from the trigger-suggestion config. When omitted, the
   * default text chip is used.
   */
  renderCustomToken?: TriggerSuggestionConfig["renderCustomToken"];
}

export class CarbonTokenNodeView implements NodeView {
  dom: HTMLElement;

  constructor(
    node: PMNode,
    view: EditorView,
    options: CarbonTokenNodeViewOptions,
  ) {
    this.dom = renderTokenChip({
      attrs: node.attrs as TokenChipAttrs,
      config: { renderCustomToken: options.renderCustomToken },
      type: node.type.name,
      dispatchTarget: view.dom,
      context: "composer",
    });
  }

  stopEvent() {
    return true;
  }

  ignoreMutation() {
    return true;
  }

  /** Atomic: PM does not track interior content. */
  get contentDOM(): null {
    return null;
  }
}

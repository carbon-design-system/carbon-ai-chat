/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as PMNode } from "prosemirror-model";
import {
  type SuggestionConfig,
  type SuggestionItem,
  SuggestionType,
} from "../types.js";
import { createDefaultChip } from "./schema.js";
import type { SuggestionConfigsRef } from "./trigger-plugin.js";

/**
 * Creates the token plugin that provides a NodeView factory for rendering
 * token (mention/command) chips.
 *
 * The NodeView renders in light DOM (since the PM editor lives in light DOM),
 * ensuring custom token renderers produce styleable elements.
 *
 * The renderer is looked up from the matching `SuggestionConfig` by token type.
 * If the config has no `renderCustomToken`, the default `<cds-tag>` chip is used.
 *
 * Supports three rendering paths:
 * 1. No custom renderer → default `<cds-tag>` chip
 * 2. Custom renderer returns HTMLElement → appended directly
 * 3. Custom renderer returns ReactNode → emits `cds-aichat-token-render` event
 *    for the React adapter to portal-render
 */
export function createTokenPlugin(configsRef: SuggestionConfigsRef): Plugin {
  return new Plugin({
    props: {
      nodeViews: {
        token(
          node: PMNode,
          view: EditorView,
          _getPos: () => number | undefined,
        ) {
          return new TokenNodeView(node, view, configsRef);
        },
      },
    },
  });
}

type TokenRenderer = NonNullable<SuggestionConfig["renderCustomToken"]>;

class TokenNodeView implements NodeView {
  dom: HTMLElement;

  constructor(
    node: PMNode,
    view: EditorView,
    configsRef: SuggestionConfigsRef,
  ) {
    this.dom = createTokenContainer(node);

    const tokenType = node.attrs.type as SuggestionType;
    const renderer = resolveRenderer(configsRef.current, tokenType);

    renderTokenContent(this.dom, view, node, renderer);
  }

  stopEvent() {
    return true;
  }

  ignoreMutation() {
    return true;
  }

  // Prevent PM from trying to serialize inner content
  get contentDOM(): null {
    return null;
  }
}

function createTokenContainer(node: PMNode): HTMLElement {
  const dom = document.createElement("span");
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("data-token-type", node.attrs.type);
  dom.setAttribute("data-raw-value", node.attrs.value);
  dom.setAttribute("role", "img");
  dom.setAttribute("aria-label", node.attrs.label || node.attrs.value);
  dom.className = "cds-aichat--token";
  // ProseMirror sets white-space:pre-wrap on its editor which inherits
  // through shadow DOM into custom token content and breaks layout of
  // components like cds-definition-tooltip. Reset it here.
  dom.style.whiteSpace = "normal";
  return dom;
}

function resolveRenderer(
  configs: SuggestionConfig[],
  tokenType: SuggestionType,
): TokenRenderer | undefined {
  const match = configs.find((c) => (c.type ?? "autocomplete") === tokenType);
  return match?.renderCustomToken;
}

function renderTokenContent(
  dom: HTMLElement,
  view: EditorView,
  node: PMNode,
  renderer: TokenRenderer | undefined,
): void {
  if (!renderer) {
    dom.appendChild(createDefaultChip(node));
    return;
  }

  const item: SuggestionItem = {
    id: node.attrs.id,
    label: node.attrs.label,
    ...(node.attrs.data ?? {}),
  };
  const tokenType = node.attrs.type as SuggestionType;

  let result: ReturnType<TokenRenderer>;
  try {
    result = renderer(item, tokenType);
  } catch (error) {
    console.error(
      "Error in renderCustomToken, falling back to default chip:",
      error,
    );
    dom.appendChild(createDefaultChip(node));
    return;
  }

  if (result == null) {
    dom.appendChild(createDefaultChip(node));
    return;
  }

  // Emit event for slot-projection rendering. Both HTMLElements and React
  // nodes go through the same path so consumer content lives in chatWrapper's
  // light DOM where page-level CSS applies.
  const container = document.createElement("span");
  container.className = "cds-aichat--token-portal-container";
  dom.appendChild(container);

  view.dom.dispatchEvent(
    new CustomEvent("cds-aichat-token-render", {
      detail: {
        container,
        item,
        type: tokenType,
        ...(result instanceof HTMLElement
          ? { htmlElement: result }
          : { reactNode: result }),
      },
      bubbles: true,
      composed: true,
    }),
  );
}

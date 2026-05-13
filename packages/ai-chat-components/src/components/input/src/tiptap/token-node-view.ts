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
 * commands). It dispatches `cds-aichat-token-render` events that consumer-side
 * React portal listeners (e.g. `TokenPortalsContainer`) hydrate into chips.
 *
 * Notes:
 * - Reads attrs in the Tiptap mention shape: `id`, `label`, optional `value`,
 *   optional `data`.
 * - Renderer + chip color are passed at construction time — the carbon
 *   factories own the wiring.
 * - Default chip color resolves by `node.type.name`: `"mention"` → blue,
 *   `"command"` → gray, anything else → blue. Hosts wanting other colors
 *   pass `renderCustomToken`.
 */

import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView, NodeView } from "@tiptap/pm/view";
import type { ReactNode } from "react";

import { setVarsForSelector } from "../../../shared/dynamic-css-var-sheet.js";
import type { SuggestionItem } from "./types.js";

let tokenStyleRulesInstalled = false;

function ensureTokenStyleRules(): void {
  if (tokenStyleRulesInstalled) {
    return;
  }
  setVarsForSelector(".cds-aichat--token", { "white-space": "normal" });
  tokenStyleRulesInstalled = true;
}

export interface CarbonTokenNodeViewOptions {
  /**
   * Custom renderer from the trigger-suggestion config. When omitted, the
   * default `<cds-tag>` chip is used.
   */
  renderCustomToken?: (item: SuggestionItem) => HTMLElement | ReactNode;
}

export class CarbonTokenNodeView implements NodeView {
  dom: HTMLElement;

  constructor(
    node: PMNode,
    view: EditorView,
    options: CarbonTokenNodeViewOptions,
  ) {
    this.dom = createTokenContainer(node);
    renderTokenContent(this.dom, view, node, options);
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

function createTokenContainer(node: PMNode): HTMLElement {
  ensureTokenStyleRules();
  const dom = document.createElement("span");
  const kind = node.type.name;
  const value = readAttr(node, "value");
  const label = readAttr(node, "label");
  dom.setAttribute("contenteditable", "false");
  dom.setAttribute("data-token-type", kind);
  dom.setAttribute("data-raw-value", value ?? label ?? "");
  dom.setAttribute("role", "img");
  dom.setAttribute("aria-label", label || value || "");
  dom.className = "cds-aichat--token";
  return dom;
}

function createDefaultChip(node: PMNode): HTMLElement {
  const tag = document.createElement("cds-tag");
  tag.setAttribute("size", "sm");
  if (node.type.name === "mention") {
    tag.setAttribute("type", "blue");
  } else if (node.type.name === "command") {
    tag.setAttribute("type", "gray");
  } else {
    tag.setAttribute("type", "blue");
  }
  const label = readAttr(node, "label");
  const value = readAttr(node, "value");
  tag.textContent = label || value || "";
  return tag;
}

function renderTokenContent(
  dom: HTMLElement,
  view: EditorView,
  node: PMNode,
  options: CarbonTokenNodeViewOptions,
): void {
  const renderer = options.renderCustomToken;
  if (!renderer) {
    dom.appendChild(createDefaultChip(node));
    return;
  }

  const item: SuggestionItem = {
    id: readAttr(node, "id") ?? "",
    label: readAttr(node, "label") ?? "",
    ...((node.attrs.data ?? {}) as Record<string, unknown>),
  };

  let result: HTMLElement | ReactNode | undefined;
  try {
    result = renderer(item);
  } catch (error) {
    // eslint-disable-next-line no-console
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

  // The portal pipeline owns the actual rendering; expose a container for
  // the listener (React adapter / other host) to mount into. Event detail
  // shape preserved verbatim from the legacy token-plugin so existing
  // listeners (TokenPortalsContainer, custom-element bridges) keep working.
  const container = document.createElement("span");
  container.className = "cds-aichat--token-portal-container";
  dom.appendChild(container);

  view.dom.dispatchEvent(
    new CustomEvent("cds-aichat-token-render", {
      detail: {
        container,
        item,
        type: node.type.name,
        ...(result instanceof HTMLElement
          ? { htmlElement: result }
          : { reactNode: result }),
      },
      bubbles: true,
      composed: true,
    }),
  );
}

function readAttr(node: PMNode, name: string): string | null {
  const value = node.attrs[name];
  return typeof value === "string" ? value : null;
}

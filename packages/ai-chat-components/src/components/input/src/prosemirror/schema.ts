/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Schema } from "prosemirror-model";
import type { Node as PMNode, NodeSpec } from "prosemirror-model";

/**
 * Token node attributes stored in the ProseMirror document.
 */
export interface TokenAttrs {
  id: string;
  label: string;
  type: "mention" | "command";
  value: string;
  data: Record<string, unknown> | null;
}

const tokenNodeSpec: NodeSpec = {
  group: "inline",
  inline: true,
  atom: true,
  attrs: {
    id: { default: "" },
    label: { default: "" },
    type: { default: "mention" },
    value: { default: "" },
    data: { default: null },
  },
  toDOM(node) {
    return [
      "span",
      {
        class: "cds-aichat--token",
        "data-token-type": node.attrs.type,
        "data-raw-value": node.attrs.value,
        "data-token": JSON.stringify(node.attrs.data),
        contenteditable: "false",
      },
      node.attrs.label,
    ];
  },
  parseDOM: [
    {
      tag: "span[data-token-type]",
      getAttrs(dom) {
        if (typeof dom === "string") {
          return false;
        }
        const el = dom as HTMLElement;
        let data: Record<string, unknown> | null = null;
        try {
          const raw = el.getAttribute("data-token");
          if (raw) {
            data = JSON.parse(raw);
          }
        } catch {
          // ignore parse errors
        }
        return {
          id: data?.id ?? "",
          label: el.textContent ?? "",
          type: el.getAttribute("data-token-type") ?? "mention",
          value: el.getAttribute("data-raw-value") ?? "",
          data,
        };
      },
    },
  ],
};

/**
 * ProseMirror schema for the chat input.
 *
 * Nodes: doc, paragraph, text, token (inline atom).
 * Marks: none defined yet — the empty object keeps the schema structurally
 * extensible for future additions (bold, italic, links, etc.) without a rewrite.
 */
export const inputSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }, { tag: "div" }],
      toDOM() {
        return ["p", 0];
      },
    },
    text: { group: "inline" },
    token: tokenNodeSpec,
  },
  marks: {},
});

/**
 * Build the default `<cds-tag>` chip used when a token has no custom renderer.
 * Lives with the schema since it mirrors the token node's attrs.
 */
export function createDefaultChip(node: PMNode): HTMLElement {
  const tag = document.createElement("cds-tag");
  tag.setAttribute("size", "sm");

  if (node.attrs.type === "mention") {
    tag.setAttribute("type", "blue");
  } else if (node.attrs.type === "command") {
    tag.setAttribute("type", "gray");
  }

  tag.textContent = node.attrs.label || node.attrs.value;
  return tag;
}

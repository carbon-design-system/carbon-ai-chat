/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Node as PMNode, Schema } from "prosemirror-model";

/**
 * Serialize a ProseMirror document to a plain-text raw value.
 *
 * - Text nodes are included as-is.
 * - Token (atom) nodes are serialized to their `value` attribute
 *   (e.g. `"@Jane Smith"`, `"/summarize"`).
 * - Paragraphs are separated by `\n`.
 */
export function serializeDoc(doc: PMNode): string {
  const paragraphs: string[] = [];

  doc.forEach((block) => {
    let text = "";
    block.forEach((inline) => {
      if (inline.isText) {
        text += inline.text ?? "";
      } else if (inline.type.name === "token") {
        text += inline.attrs.value;
      }
    });
    paragraphs.push(text);
  });

  return paragraphs.join("\n");
}

/**
 * Parse a plain-text raw value into a ProseMirror document.
 *
 * Lines are split on `\n` and each becomes a paragraph node containing
 * a text node. Token references are NOT parsed from raw text — tokens
 * are only inserted via the autocomplete/insertion flow.
 *
 * An empty string produces a doc with a single empty paragraph.
 */
export function parseRawValue(schema: Schema, rawValue: string): PMNode {
  const lines = rawValue.split("\n");

  const paragraphs = lines.map((line) => {
    if (line.length === 0) {
      return schema.nodes.paragraph.create();
    }
    return schema.nodes.paragraph.create(null, schema.text(line));
  });

  return schema.nodes.doc.create(null, paragraphs);
}

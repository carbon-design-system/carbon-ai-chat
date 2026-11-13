/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * JSONContent walking utilities for Tiptap docs. These four helpers cover the
 * common cases (remove nodes by type, map nodes, find nodes, project raw text).
 *
 * For everything else, hosts reach for Tiptap's natives
 * (`findChildren`, `findChildrenByType`) on a live `Editor`.
 */

import type { Editor, JSONContent } from '@tiptap/core';

/**
 * Return a new JSONContent tree with every node whose type matches one of
 * `types` removed. Marks on text nodes are preserved.
 */
export function removeNodesByType(
  json: JSONContent,
  ...types: string[]
): JSONContent {
  const filter = new Set(types);
  return mapNodes(json, (node) => (filter.has(node.type ?? '') ? null : node));
}

/**
 * Map every node in the tree through `fn`. Returning `null` removes the node
 * from its parent's `content`. Returning a node replaces it. The walk is
 * post-order: children are visited before their parents.
 *
 * `fn` receives a node reference; treat it as immutable and return a fresh
 * object when mutating.
 */
export function mapNodes(
  json: JSONContent,
  fn: (node: JSONContent) => JSONContent | null
): JSONContent {
  const walked = walk(json, fn);
  return walked ?? { type: 'doc', content: [{ type: 'paragraph' }] };
}

function walk(
  node: JSONContent,
  fn: (node: JSONContent) => JSONContent | null
): JSONContent | null {
  let next: JSONContent = node;
  if (node.content && node.content.length > 0) {
    const mappedChildren: JSONContent[] = [];
    for (const child of node.content) {
      const result = walk(child, fn);
      if (result !== null) {
        mappedChildren.push(result);
      }
    }
    next = { ...node, content: mappedChildren };
  }
  return fn(next);
}

/**
 * Collect every node in the tree whose `type` matches `type`. Returns a flat
 * array in document order.
 */
export function findNodesByType(
  json: JSONContent,
  type: string
): JSONContent[] {
  const matches: JSONContent[] = [];
  walkAll(json, (node) => {
    if (node.type === type) {
      matches.push(node);
    }
  });
  return matches;
}

function walkAll(node: JSONContent, visit: (node: JSONContent) => void): void {
  visit(node);
  if (node.content) {
    for (const child of node.content) {
      walkAll(child, visit);
    }
  }
}

/**
 * Project a JSONContent doc to a plain-text string, with markdown-like
 * breaks. This is the input's `rawValue` projection in both editors:
 *
 * - Text nodes contribute their `text`.
 * - `mention` / `command` nodes (and any other `attrs.value`-bearing atom)
 *   contribute `attrs.value || attrs.label`.
 * - `paragraph` boundaries become `"\n\n"` (excluding the trailing one).
 * - `hardBreak` nodes contribute `"\n"`.
 *
 * Unknown node types are walked through to their children; if they have no
 * children and no recognized attrs, they contribute nothing.
 */
export function getRawText(json: JSONContent): string {
  const parts: string[] = [];
  collect(json, parts, /* topLevel */ true, /* paragraphIndex */ { count: 0 });
  return parts.join('');
}

function collect(
  node: JSONContent,
  out: string[],
  topLevel: boolean,
  paragraphIndex: { count: number }
): void {
  switch (node.type) {
    case 'text':
      out.push(node.text ?? '');
      return;
    case 'hardBreak':
      out.push('\n');
      return;
    case 'paragraph':
      if (paragraphIndex.count > 0) {
        out.push('\n\n');
      }
      paragraphIndex.count += 1;
      if (node.content) {
        for (const child of node.content) {
          collect(child, out, false, paragraphIndex);
        }
      }
      return;
    case 'doc':
      if (node.content) {
        for (const child of node.content) {
          collect(child, out, topLevel, paragraphIndex);
        }
      }
      return;
    default: {
      // Atom nodes like mention/command — pull `value` (or `label`) off attrs.
      const attrs = (node.attrs ?? {}) as Record<string, unknown>;
      const value = typeof attrs.value === 'string' ? attrs.value : null;
      const label = typeof attrs.label === 'string' ? attrs.label : null;
      if (value !== null || label !== null) {
        out.push(value || label || '');
        return;
      }
      // Fall through: walk children.
      if (node.content) {
        for (const child of node.content) {
          collect(child, out, false, paragraphIndex);
        }
      }
    }
  }
}

/**
 * Project the editor's current document into the legacy `rawValue` string.
 * Thin wrapper over `getRawText(editor.getJSON())`.
 */
export function projectRawValue(editor: Editor): string {
  return getRawText(editor.getJSON());
}

/**
 * Build a JSONContent doc from a plain-text string with markdown-like breaks,
 * the inverse of {@link getRawText} for plain text
 * (`getRawText(textToDoc(s)) === s`): `"\n\n"` starts a new paragraph and a
 * single `"\n"` becomes a `hardBreak`. Used to seed the rich editor losslessly
 * from the textarea's value when the prompt-line upgrades from textarea to
 * Tiptap mode.
 */
export function textToDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: text.split('\n\n').map((block) => {
      const content: JSONContent[] = [];
      block.split('\n').forEach((line, index) => {
        if (index > 0) {
          content.push({ type: 'hardBreak' });
        }
        if (line) {
          content.push({ type: 'text', text: line });
        }
      });
      return content.length
        ? { type: 'paragraph', content }
        : { type: 'paragraph' };
    }),
  };
}

/**
 * Map a plain-text offset into a ProseMirror position inside the doc
 * {@link textToDoc} builds from the same text. Lives here because it encodes
 * that function's shape: every character costs one position (a `hardBreak` is
 * one, and a `"\n\n"` paragraph boundary closes one paragraph and opens the
 * next), plus one for the doc/first-paragraph start. An offset between the two
 * newlines of a boundary, a caret on the blank line, has no position of its
 * own, so it moves to the start of the next paragraph. Change `textToDoc` and
 * this has to change with it.
 */
export function textOffsetToDocPos(text: string, offset: number): number {
  // Find boundaries the way `textToDoc`'s split does: left to right, without
  // overlap.
  let boundary = text.indexOf('\n\n');
  while (boundary !== -1 && boundary < offset) {
    if (offset === boundary + 1) {
      return offset + 2;
    }
    boundary = text.indexOf('\n\n', boundary + 2);
  }
  return offset + 1;
}

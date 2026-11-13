/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { JSONContent } from '@tiptap/core';

export function literalTextToDoc(text: string): JSONContent {
  const content: JSONContent[] = [];
  text.split('\n').forEach((line, index) => {
    if (index > 0) {
      content.push({ type: 'hardBreak' });
    }
    if (line) {
      content.push({ type: 'text', text: line });
    }
  });
  return {
    type: 'doc',
    content: [
      content.length ? { type: 'paragraph', content } : { type: 'paragraph' },
    ],
  };
}

export function isPlainTextDoc(json: JSONContent): boolean {
  const allowed = new Set(['doc', 'paragraph', 'text', 'hardBreak']);
  let ok = true;
  const walk = (node: JSONContent | undefined): void => {
    if (!ok || !node) {
      return;
    }
    if (typeof node.type === 'string' && !allowed.has(node.type)) {
      ok = false;
      return;
    }
    if (
      node.type === 'text' &&
      Array.isArray(node.marks) &&
      node.marks.length > 0
    ) {
      ok = false;
      return;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
        if (!ok) {
          return;
        }
      }
    }
  };
  walk(json);
  return ok;
}

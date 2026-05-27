/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { TokenTree } from "../markdown-token-tree.js";

/**
 * True if the right-most leaf of the tree is a `table` token. A trailing table
 * is one that sits at the end of the current markdown output, not just at the
 * end of an arbitrary subtree — so we follow only the rightmost branch.
 */
export function hasTrailingTableToken(node: TokenTree): boolean {
  if (node.token.tag === "table") {
    return true;
  }

  const children = node.children || [];
  if (children.length === 0) {
    return false;
  }

  return hasTrailingTableToken(children[children.length - 1]);
}

/**
 * True if any table token in the tree has a sibling that follows it. Used to
 * detect that the streaming author has moved past a table, so we can exit the
 * "table loading" hold and render the live table.
 */
export function hasNodeAfterTable(node: TokenTree): boolean {
  const children = node.children || [];
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.token.tag === "table" && index < children.length - 1) {
      return true;
    }
    if (hasNodeAfterTable(child)) {
      return true;
    }
  }
  return false;
}

/**
 * True when a table at `currentIndex` inside `parentChildren` has no
 * siblings after it — i.e. it is currently the last child of its parent.
 * The streaming-table renderer uses this to decide whether the live table
 * should show its skeleton/loading state.
 */
export function isTableAtStreamingTail(
  parentChildren: readonly unknown[],
  currentIndex: number,
): boolean {
  return currentIndex >= parentChildren.length - 1;
}

/**
 * Heuristic that returns true when the last non-empty line of the markdown
 * source looks like an in-progress table row or separator. markdown-it can
 * momentarily stop recognizing the table token while a row is half-written, so
 * the streaming-table hold uses this to avoid flickering between table and
 * non-table renderings.
 */
export function hasLikelyPartialTableTail(markdown: string): boolean {
  const normalized = markdown.replace(/\r/g, "");
  const lines = normalized.split("\n");
  let index = lines.length - 1;

  while (index >= 0 && lines[index].trim() === "") {
    index--;
  }

  if (index < 0) {
    return false;
  }

  const lastLine = lines[index].trim();

  // During streaming, partially emitted table rows frequently end with a pipe
  // and markdown-it can temporarily stop recognizing the table token.
  if (lastLine.startsWith("|") || lastLine.endsWith("|")) {
    return true;
  }

  // Keep loading mode if the tail still looks like a table separator row.
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(lastLine);
}

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This gets run in a worker, so don't bring in window/document related things
 * like Lit into this file.
 */

import { Token } from "markdown-it";

/**
 * Represents a node in the token tree. This structure is used
 * to recursively render markdown content using Lit.
 */
interface TokenTree {
  key: string;
  token: Partial<Token>;
  children: TokenTree[];
}

/**
 * Converts a flat list of markdown-it tokens into a nested tree of TokenTrees.
 *
 * markdown-it returns a linear array of tokens that represent both block and inline
 * elements, including opening/closing tags and inline children. This function
 * reconstructs the intended hierarchical structure by walking the list and building
 * a tree based on token nesting levels.
 *
 * A stack is used to track the current node context. When an opening token is
 * encountered (nesting = 1), the function creates a node and pushes it onto the stack.
 * When a closing token is encountered (nesting = -1), the current context is popped.
 * Tokens with nesting = 0 are self-contained and added as children of the current node.
 *
 * Inline tokens are handled recursively by inspecting the `children` array.
 */
function buildTokenTree(tokens: Token[]): TokenTree {
  const root: TokenTree = {
    key: "root",
    token: {
      type: "root",
      tag: "",
      nesting: 0,
      level: 0,
      content: "",
      attrs: null,
      children: null,
      markup: "",
      block: true,
      hidden: false,
      map: null,
      info: "",
      meta: null,
    },
    children: [],
  };

  // Stack keeps track of the current nesting level during traversal.
  const stack: TokenTree[] = [root];

  tokens.forEach((token) => {
    const node: TokenTree = {
      key: generateKey(token),
      token,
      children: [],
    };

    // Inline tokens may contain their own list of tokens in `children`.
    // Recursively parse and attach those as this node's children.
    if (token.type === "inline" && token.children?.length) {
      node.children = buildTokenTree(token.children).children;
    }

    const current = stack[stack.length - 1];

    if (token.nesting === 1) {
      // Opening tag — add to current node and go deeper in the tree.
      current.children.push(node);
      stack.push(node);
    } else if (token.nesting === -1) {
      // Closing tag — pop out of the current container.
      stack.pop();
    } else {
      // Flat token (e.g., text or self-contained element) — add to current level.
      current.children.push(node);
    }
  });

  return root;
}

/**
 * Generates a unique string key for a markdown-it token base on the starting and ending index of this block
 * and what markdown token type and tag that block maps to.
 * Used to help Lit’s `repeat()` directive track updates efficiently.
 */
function generateKey(token: Token): string {
  const map = token.map ? token.map.join("-") : "";
  return `${token.type}:${token.tag}:${map}`;
}

/**
 * This function compares two trees of tokens and tries to reuse as much of the old tree as possible when
 * the new tree looks the same.
 *
 * - If the top-level nodes have different keys, the entire thing changed, so return the new one.
 * - If the keys match, check the children of that node and reuse any unchanged ones.
 * - We do this by matching keys for each child.
 * - This function runs itself (recursively) for each child node. It's like going deeper into the tree.
 *
 * This function doesn't check every little detail - just the keys.
 *
 */
function diffTokenTree(
  oldTree: TokenTree | undefined,
  newTree: TokenTree,
): TokenTree {
  // If the keys don’t match, it means this part of the tree is totally different,
  // so we stop and just return the new one (no need to go deeper).
  if (!oldTree || oldTree.key !== newTree.key) {
    return newTree;
  }

  // If we get here, it means the keys match — so the structure is *probably* the same.
  // We’ll create a new node, but reuse any children that are still the same.
  const merged: TokenTree = {
    key: newTree.key,
    token: newTree.token,
    children: [],
  };

  // Create a "lookup table" of old children using their keys.
  // This helps us quickly find if a new child was already in the old tree.
  const oldChildrenByKey = new Map(
    oldTree.children.map((child) => [child.key, child]),
  );

  // Now go through each new child and decide:
  // - If it existed before (same key), reuse it by calling diffTokenTree again.
  // - If it's totally new (new key), just use it.
  newTree.children.forEach((newChild) => {
    const oldChild = oldChildrenByKey.get(newChild.key);

    // Reuse the old child if it exists, and keep diffing deeper into the tree
    if (oldChild) {
      merged.children.push(diffTokenTree(oldChild, newChild));
    } else {
      // Otherwise, use the brand new child
      merged.children.push(newChild);
    }
  });

  // Return the final merged tree — it's a mix of reused and new pieces.
  return merged;
}

export { type TokenTree, buildTokenTree, diffTokenTree };

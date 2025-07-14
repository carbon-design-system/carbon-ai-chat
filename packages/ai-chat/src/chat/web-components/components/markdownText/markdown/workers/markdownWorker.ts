/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { parseMarkdown } from "../utils/markdown";
import { buildTokenTree, diffTokenTree } from "../utils/tokenTree";

globalThis.onmessage = function onmessage(e) {
  const { id, markdown, lastTree } = e.data;
  const tokens = parseMarkdown(markdown);
  const newTree = buildTokenTree(tokens);
  const finalTree = lastTree ? diffTokenTree(lastTree, newTree) : newTree;
  postMessage([id, finalTree]);
};

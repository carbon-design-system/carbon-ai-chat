/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A markdown-it plugin that handles text highlighting using ==highlight== syntax.
 * This follows the extended markdown syntax from https://www.markdownguide.org/extended-syntax/
 */

import MarkdownIt from "markdown-it";

function markdownItHighlight(md: MarkdownIt) {
  // Define the highlight rule
  md.inline.ruler.before("emphasis", "highlight", (state, silent) => {
    const marker = "==";
    const markerLength = marker.length;
    const start = state.pos;

    if (state.src.slice(start, start + markerLength) !== marker) {
      return false;
    }

    if (silent) {
      return false; // Don't execute when in silent mode
    }

    const max = state.posMax;
    let pos = start + markerLength;

    // Find the closing marker
    while (pos < max) {
      if (state.src.slice(pos, pos + markerLength) === marker) {
        const content = state.src.slice(start + markerLength, pos);

        if (content.trim()) {
          const token = state.push("highlight_open", "mark", 1);
          token.markup = marker;

          const textToken = state.push("text", "", 0);
          textToken.content = content;

          const closeToken = state.push("highlight_close", "mark", -1);
          closeToken.markup = marker;

          state.pos = pos + markerLength;
          return true;
        }
        break;
      }
      pos++;
    }

    return false;
  });
}

export { markdownItHighlight };

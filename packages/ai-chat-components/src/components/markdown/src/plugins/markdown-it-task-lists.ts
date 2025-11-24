/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A markdown-it plugin that handles task lists with checkbox syntax.
 * Implements GitHub Flavored Markdown task list extension.
 *
 * Syntax:
 * - [ ] Unchecked task
 * - [x] Checked task
 * - [X] Checked task (uppercase also supported)
 */

import MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";

function markdownItTaskLists(md: MarkdownIt) {
  md.core.ruler.after("inline", "task-lists", (state: StateCore) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Look for list items
      if (token.type !== "inline") {
        continue;
      }

      // Check if we're inside a list item
      if (i < 2 || tokens[i - 2].type !== "list_item_open") {
        continue;
      }

      const children = token.children;
      if (!children || children.length === 0) {
        continue;
      }

      // Check if the first child starts with task list syntax
      const firstChild = children[0];
      if (firstChild.type !== "text") {
        continue;
      }

      const match = firstChild.content.match(/^\[([ xX])\]\s+/);
      if (!match) {
        continue;
      }

      const checked = match[1] !== " ";
      const listItemToken = tokens[i - 2];

      // Add task-list-item class to the list item
      const attrs = listItemToken.attrs || [];
      const classIndex = attrs.findIndex(([key]) => key === "class");
      if (classIndex >= 0) {
        attrs[classIndex][1] += " task-list-item";
      } else {
        attrs.push(["class", "task-list-item"]);
      }
      listItemToken.attrs = attrs;

      const checkboxOpenToken: Token = new state.Token(
        "task_checkbox_open",
        "cds-checkbox",
        1,
      );
      checkboxOpenToken.content = "";
      checkboxOpenToken.attrs = [
        ["checked", checked ? "true" : "false"],
        ["disabled", "true"],
      ];

      const checkboxCloseToken: Token = new state.Token(
        "task_checkbox_close",
        "cds-checkbox",
        -1,
      );
      checkboxCloseToken.content = "";

      // Remove the checkbox syntax from the text
      firstChild.content = firstChild.content.slice(match[0].length);

      // Insert checkbox token at the beginning
      children.unshift(checkboxOpenToken);
      children.push(checkboxCloseToken);
    }

    return false;
  });
}

export { markdownItTaskLists };

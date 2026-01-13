/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
function markdownItTaskLists(md) {
    md.core.ruler.after("inline", "task-lists", (state) => {
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
            }
            else {
                attrs.push(["class", "task-list-item"]);
            }
            listItemToken.attrs = attrs;
            const checkboxOpenToken = new state.Token("task_checkbox_open", "cds-custom-checkbox", 1);
            checkboxOpenToken.content = "";
            checkboxOpenToken.attrs = [
                ["checked", checked ? "true" : "false"],
                ["disabled", "true"],
            ];
            const checkboxCloseToken = new state.Token("task_checkbox_close", "cds-custom-checkbox", -1);
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
//# sourceMappingURL=markdown-it-task-lists.js.map

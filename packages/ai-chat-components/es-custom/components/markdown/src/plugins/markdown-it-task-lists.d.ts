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
declare function markdownItTaskLists(md: MarkdownIt): void;
export { markdownItTaskLists };

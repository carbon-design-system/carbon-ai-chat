/**
 * A markdown-it plugin that handles text highlighting using ==highlight== syntax.
 * This follows the extended markdown syntax from https://www.markdownguide.org/extended-syntax/
 */
import MarkdownIt from "markdown-it";
declare function markdownItHighlight(md: MarkdownIt): void;
export { markdownItHighlight };

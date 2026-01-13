import type MarkdownIt from "markdown-it";
import type { MarkdownItAttrsOptions } from "./markdownItAttrs/types.js";
/**
 * Markdown-it plugin that adds support for applying attributes to markdown elements using curly brace syntax.
 */
export declare function markdownItAttrs(md: MarkdownIt, options_?: MarkdownItAttrsOptions): void;
export default markdownItAttrs;

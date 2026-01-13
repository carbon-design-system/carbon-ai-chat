import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Pattern for fenced code blocks with attributes.
 * Example: ```js {.highlight}
 */
export declare function createFencedCodeBlockPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;

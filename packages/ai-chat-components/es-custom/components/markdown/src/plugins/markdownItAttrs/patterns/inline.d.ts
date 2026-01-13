import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Pattern for inline elements with nesting level 0 (images, inline code).
 * Example: ![alt](img.jpg){.class} or `code`{.class}
 */
export declare function createInlineNesting0Pattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for inline attributes on emphasized/strong text.
 * Example: **bold**{.class}
 */
export declare function createInlineAttributesPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for softbreak followed by attributes at start of line.
 */
export declare function createSoftbreakCurlyPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for attributes at the end of a block.
 */
export declare function createEndOfBlockPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;

import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Pattern for horizontal rules with attributes.
 * Example: --- {.class}
 */
export declare function createHorizontalRulePattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;

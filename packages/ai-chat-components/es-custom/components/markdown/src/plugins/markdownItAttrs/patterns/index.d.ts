import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Creates an array of patterns used to detect and transform markdown tokens with attribute syntax.
 */
export declare function createPatterns(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern[];

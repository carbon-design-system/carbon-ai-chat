import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Pattern for list items with attributes after softbreak.
 */
export declare function createListSoftbreakPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for lists with double softbreak before attributes.
 */
export declare function createListDoubleSoftbreakPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for list items with attributes at the end.
 */
export declare function createListItemEndPattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;

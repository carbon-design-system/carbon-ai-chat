import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
/**
 * Pattern for table attributes.
 */
export declare function createTablePattern(options: Required<MarkdownItAttrsOptions>): CurlyAttrsPattern;
/**
 * Pattern for table header metadata calculation (used for colspan/rowspan).
 */
export declare function createTableTheadMetadataPattern(): CurlyAttrsPattern;
/**
 * Pattern for table body calculation for handling colspan/rowspan.
 */
export declare function createTableTbodyCalculatePattern(): CurlyAttrsPattern;

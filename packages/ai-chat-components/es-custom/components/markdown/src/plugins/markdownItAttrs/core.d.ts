import type { Token } from "markdown-it";
import type { MarkdownItAttrsOptions, AttributePair, DetectingStrRule, DetectingRule, MatchedResult } from "./types.js";
/**
 * Parses attribute strings in the format {.class #id key=val} and returns an array of attribute key-value pairs.
 */
export declare function getAttrs(str: string, start: number, options: Required<MarkdownItAttrsOptions>): AttributePair[];
/**
 * Applies an array of attribute pairs to a token, handling special cases for class and css-module attributes.
 */
export declare function addAttrs(attrs: AttributePair[], token: Token): Token;
/**
 * Creates a function that tests whether a string contains attribute delimiters at a specified position (start, end, or only).
 */
export declare function hasDelimiters(where: "start" | "end" | "only", options: Required<MarkdownItAttrsOptions>): DetectingStrRule;
/**
 * Removes attribute delimiters and their contents from the end of a string.
 */
export declare function removeDelimiter(str: string, options: Required<MarkdownItAttrsOptions>): string;
/**
 * Finds the matching opening token for a given closing token by searching backwards through the token array.
 */
export declare function getMatchingOpeningToken(tokens: Token[], closingTokenIndex: number): Token | false;
/**
 * Tests whether a token at a given index matches a detecting rule, recursively checking nested rules.
 */
export declare function test(tokens: Token[], baseIndex: number, rule: DetectingRule): MatchedResult;

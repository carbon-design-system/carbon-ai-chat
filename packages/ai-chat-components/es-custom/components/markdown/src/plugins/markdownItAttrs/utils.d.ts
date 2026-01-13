import type { Token } from "markdown-it";
/**
 * Escapes special regex characters in a string for use in regular expressions.
 */
export declare function escapeRegExp(s: string): string;
/**
 * Gets an element from an array, supporting negative indices for accessing from the end.
 */
export declare function get<T>(arr: T[], n: number): T | undefined;
/**
 * Returns the last element of an array, or an empty object if the array is empty.
 */
export declare function last<T>(arr: T[]): T;
/**
 * Type guard to check if a value is a non-empty array of objects.
 */
export declare function isArrayOfObjects(arr: unknown): arr is Record<string, unknown>[];
/**
 * Type guard to check if a value is a non-empty array of functions.
 */
export declare function isArrayOfFunctions(arr: unknown): arr is ((arg: unknown) => boolean)[];
/**
 * Recursively hides a token and all its children by setting their hidden flag and clearing content.
 */
export declare function hidden(token: Token): void;

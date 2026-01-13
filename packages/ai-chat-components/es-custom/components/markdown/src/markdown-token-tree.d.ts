import { Token } from "markdown-it";
/**
 * Represents a node in the token tree structure.
 */
export interface TokenTree {
    /** Unique identifier for this node, used for efficient diffing */
    key: string;
    /** The original markdown-it token data */
    token: Partial<Token>;
    /** Child nodes for nested content */
    children: TokenTree[];
}
/**
 * Parses markdown text into a flat array of markdown-it tokens.
 */
export declare function markdownToMarkdownItTokens(fullText: string, allowHtml?: boolean): Token[];
/**
 * Converts a flat list of markdown-it tokens into a tree.
 */
export declare function buildTokenTree(tokens: Token[]): TokenTree;
/**
 * Compares two TokenTree structures and creates a new tree that reuses
 * unchanged nodes from the old tree.
 *
 * This optimization is crucial for performance when content is being streamed
 * or updated incrementally.
 */
export declare function diffTokenTree(oldTree: TokenTree | undefined, newTree: TokenTree): TokenTree;
/**
 * Converts markdown into a tree with keys on it for Lit.
 */
export declare function markdownToTokenTree(markdown: string, lastTree?: TokenTree, allowHtml?: boolean): TokenTree;

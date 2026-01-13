import type { TokenTree } from "../markdown-token-tree";
export declare const DEFAULT_PAGINATION_SUPPLEMENTAL_TEXT: ({ count, }: {
    count: number;
}) => string;
export declare const DEFAULT_PAGINATION_STATUS_TEXT: ({ start, end, count, }: {
    start: number;
    end: number;
    count: number;
}) => string;
export interface TableCellData {
    text: string;
    tokens: TokenTree[] | null;
}
/**
 * Extracts tabular data from a table TokenTree node.
 *
 * Converts the hierarchical markdown table structure into the flat
 * header/rows format expected by the cds-aichat-table component while retaining
 * the TokenTree children required for rich rendering within cells.
 */
export declare function extractTableData(tableNode: TokenTree): {
    headers: TableCellData[];
    rows: TableCellData[][];
};
/**
 * Recursively extracts plain text content from a TokenTree node.
 *
 * This is used for table cells and other contexts where we need the
 * text content without HTML formatting.
 */
export declare function extractTextContent(node: TokenTree): string;

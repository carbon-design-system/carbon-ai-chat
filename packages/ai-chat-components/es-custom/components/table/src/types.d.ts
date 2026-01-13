/**
 * A table cell value
 */
export type TableItemCell = string | number;
/**
 * A table row with cells
 */
export interface TableItemRow {
    /**
     * Data for a specific cell.
     */
    cells: TableItemCell[];
}

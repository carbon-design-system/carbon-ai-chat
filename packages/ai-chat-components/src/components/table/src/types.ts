/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shape passed from the inline table renderer in `App.tsx` to the
 * `WorkspaceTable` workspace-panel content. Plain strings rather than the
 * markdown-it `TableCellData` objects, so the WorkspaceTable doesn't need
 * to know anything about markdown internals.
 */

export interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
}

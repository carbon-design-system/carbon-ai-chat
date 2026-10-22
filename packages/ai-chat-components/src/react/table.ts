/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { CDSAIChatTable } from '../components/aichat-table/index.js';

const Table = createComponent({
  tagName: CDSAIChatTable.is,
  elementClass: CDSAIChatTable,
  react: React,
});

export default Table;
export type {
  TableCellContent,
  TableRowContent,
} from '../components/aichat-table/aichat-table.js';

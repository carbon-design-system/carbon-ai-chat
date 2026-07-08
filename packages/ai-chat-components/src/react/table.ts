/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

import CDSAIChatTable from "../components/table/src/table.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const Table = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-table",
    elementClass: CDSAIChatTable,
    react: React,
  }),
);

export default Table;
export type {
  TableCellContent,
  TableRowContent,
} from "../components/table/src/table.js";

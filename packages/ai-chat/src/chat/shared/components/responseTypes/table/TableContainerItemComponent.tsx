/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Suspense } from "react";
import { SkeletonPlaceholder } from "../../SkeletonPicker";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { TableItem } from "../../../../../types/messaging/Messages";
import { lazyTable } from "../../../../dynamic-imports/dynamic-imports";

const TableContainer = lazyTable();

function TableContainerItemComponent({
  tableItem,
}: {
  tableItem: LocalMessageItem<TableItem>["item"];
}) {
  return (
    <Suspense fallback={<SkeletonPlaceholder />}>
      <TableContainer tableItem={tableItem} />
    </Suspense>
  );
}

export { TableContainerItemComponent };

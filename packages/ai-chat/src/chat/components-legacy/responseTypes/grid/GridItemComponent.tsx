/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React from "react";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import {
  GridItem,
  MessageResponse,
  WidthOptions,
} from "../../../../types/messaging/Messages";
import { MessageTypeComponentProps } from "../../../../types/messaging/MessageTypeComponentProps";
import { GridItemCell } from "./GridItemCell";

// This regex is for validating a number (1) or pixel value (10px) which are the only valid width values for a column.
const VALID_COLUMN_WIDTH_REGEX = /^[0-9]*(px)?$/;
const DEFAULT_COLUMN_WIDTH = "1";

/**
 * This component renders the grid response type. It will handle creating the rows/columns and renders the response
 * types within them.
 */
function GridItemComponent({
  localMessageItem,
  originalMessage,
  renderMessageComponent,
}: {
  localMessageItem: LocalMessageItem<GridItem>;
  originalMessage: MessageResponse;
  renderMessageComponent: (props: MessageTypeComponentProps) => React.ReactNode;
}) {
  const { columns, max_width } = localMessageItem.item;

  return (
    <div
      className={cx("cds-aichat--grid", {
        "cds-aichat--max-width-small": max_width === WidthOptions.SMALL,
        "cds-aichat--max-width-medium": max_width === WidthOptions.MEDIUM,
        "cds-aichat--max-width-large": max_width === WidthOptions.LARGE,
      })}
    >
      {localMessageItem.ui_state.gridLocalMessageItemIDs.map(
        (row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="cds-aichat--grid__row">
            {row.map((cell, columnIndex) => {
              const cellData =
                localMessageItem.item.rows[rowIndex]?.cells[columnIndex];
              let columnWidthString =
                columns?.[columnIndex]?.width || DEFAULT_COLUMN_WIDTH;
              let isPixelValue;

              if (columnWidthString.match(VALID_COLUMN_WIDTH_REGEX)) {
                isPixelValue = columnWidthString.endsWith("px");
              } else {
                columnWidthString = DEFAULT_COLUMN_WIDTH;
                isPixelValue = false;
              }

              return (
                <GridItemCell
                  localMessageItem={localMessageItem}
                  renderMessageComponent={renderMessageComponent}
                  cell={cell}
                  originalMessage={originalMessage}
                  cellData={cellData}
                  columnWidthString={columnWidthString}
                  key={`cell-${rowIndex}-${columnIndex}`}
                  isPixelValue={isPixelValue}
                  rowIndex={rowIndex}
                  columnIndex={columnIndex}
                />
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}

const GridItemComponentExport = React.memo(GridItemComponent);

export { GridItemComponentExport as GridItemComponent };

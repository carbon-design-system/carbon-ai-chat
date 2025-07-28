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
import { useSelector } from "react-redux";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { selectInputState } from "../../../store/selectors";
import { AppState } from "../../../../../types/state/AppState";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { THROW_ERROR } from "../../../utils/constants";
import {
  GridItem,
  HorizontalCellAlignment,
  MessageResponse,
  VerticalCellAlignment,
  WidthOptions,
} from "../../../../../types/messaging/Messages";

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
  renderMessageComponent: (props: any) => React.ReactNode;
}) {
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const appConfig = useSelector((state: AppState) => state.config);
  const inputState = useSelector(selectInputState);
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID
  );
  const { columns, horizontal_alignment, vertical_alignment, max_width } =
    localMessageItem.item;
  const gridTemplateColumns =
    columns?.map((column) => column.width).join(" ") || DEFAULT_COLUMN_WIDTH;

  return (
    <div
      className={cx("WACGrid", {
        WACMaxWidthSmall: max_width === WidthOptions.SMALL,
        WACMaxWidthMedium: max_width === WidthOptions.MEDIUM,
        WACMaxWidthLarge: max_width === WidthOptions.LARGE,
      })}
      // eslint-disable-next-line react/forbid-dom-props
      style={{ gridTemplateColumns }}
    >
      {localMessageItem.ui_state.gridLocalMessageItemIDs.map(
        (row, rowIndex) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`row-${rowIndex}`} className="WACGrid__Row">
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
                <div
                  className="WACGrid__Cell"
                  // eslint-disable-next-line react/forbid-dom-props
                  style={{
                    width: isPixelValue ? columnWidthString : undefined,
                    flex: isPixelValue ? undefined : Number(columnWidthString),
                    alignItems: getFlexAlignment(
                      cellData?.horizontal_alignment || horizontal_alignment
                    ),
                    justifyContent: getFlexAlignment(
                      cellData?.vertical_alignment || vertical_alignment
                    ),
                  }}
                  // eslint-disable-next-line react/no-array-index-key
                  key={`cell-${rowIndex}-${columnIndex}`}
                >
                  {cell.map((localMessageItemID, itemIndex) => {
                    const message = allMessageItemsByID[localMessageItemID];
                    return (
                      <React.Fragment key={`item-${rowIndex}-${columnIndex}-${itemIndex}`}>
                        {renderMessageComponent({
                          message,
                          originalMessage,
                          languagePack,
                          requestInputFocus: THROW_ERROR,
                          disableUserInputs: inputState.isReadonly,
                          config: appConfig,
                          isMessageForInput: false,
                          scrollElementIntoView: THROW_ERROR,
                          serviceManager,
                          isNestedMessageItem: true,
                          hideFeedback: true,
                          allowNewFeedback: false,
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/**
 * Returns the CSS flex alignment for the given horizontal/vertical alignment value;
 */
function getFlexAlignment(
  value: HorizontalCellAlignment | VerticalCellAlignment
) {
  switch (value) {
    case "bottom":
    case "right":
      return "flex-end";
    case "center":
      return "center";
    case "top":
    case "left":
    default:
      return "flex-start";
  }
}

const GridItemComponentExport = React.memo(GridItemComponent);

export { GridItemComponentExport as GridItemComponent };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useRef } from "react";
import { useSelector } from "../../../hooks/useSelector";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { selectInputState } from "../../../store/selectors";
import { AppState } from "../../../../types/state/AppState";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { THROW_ERROR } from "../../../utils/constants";
import {
  applyDynamicStyles,
  clearDynamicStyles,
} from "../../../utils/cspStyleUtils";
import {
  GenericItem,
  GridItem,
  HorizontalCellAlignment,
  MessageResponse,
  VerticalCellAlignment,
} from "../../../../types/messaging/Messages";
import { MessageTypeComponentProps } from "../../../../types/messaging/MessageTypeComponentProps";

function GridItemCell({
  cell,
  cellData,
  columnIndex,
  columnWidthString,
  isPixelValue,
  localMessageItem,
  originalMessage,
  renderMessageComponent,
  rowIndex,
}: {
  cell: string[];
  cellData: {
    horizontal_alignment?: HorizontalCellAlignment;
    vertical_alignment?: VerticalCellAlignment;
    items: GenericItem[];
  };
  columnIndex: number;
  columnWidthString: string;
  isPixelValue: boolean | string;
  localMessageItem: LocalMessageItem<GridItem>;
  originalMessage: MessageResponse;
  renderMessageComponent: (props: MessageTypeComponentProps) => React.ReactNode;
  rowIndex: number;
}) {
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const appConfig = useSelector((state: AppState) => state.config);
  const inputState = useSelector(selectInputState);
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID,
  );

  const { horizontal_alignment, vertical_alignment } = localMessageItem.item;

  const cellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = cellRef.current;
    if (!node) {
      return undefined;
    }
    const horizontal = cellData?.horizontal_alignment || horizontal_alignment;
    const declarations: Record<string, string> = {
      "align-items": getFlexAlignment(horizontal),
      "justify-content": getFlexAlignment(
        cellData?.vertical_alignment || vertical_alignment,
      ),
    };
    if (isPixelValue) {
      declarations["inline-size"] = columnWidthString;
    } else {
      declarations.flex = `${Number(columnWidthString)}`;
    }
    if (horizontal) {
      declarations["text-align"] = horizontal;
    }
    applyDynamicStyles(node, "grid-cell", declarations);
    return () => clearDynamicStyles(node, "grid-cell");
  }, [
    isPixelValue,
    columnWidthString,
    cellData?.horizontal_alignment,
    cellData?.vertical_alignment,
    horizontal_alignment,
    vertical_alignment,
  ]);

  return (
    <div className="cds-aichat--grid__cell" ref={cellRef}>
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
              showChainOfThought: false,
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Returns the CSS flex alignment for the given horizontal/vertical alignment value;
 */
function getFlexAlignment(
  value: HorizontalCellAlignment | VerticalCellAlignment,
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

export { GridItemCell };

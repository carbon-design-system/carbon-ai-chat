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

import { MessageTypeComponent } from "../../../containers/MessageTypeComponent";
import { AppState } from "../../../../../types/state/AppState";
import { MessageTypeComponentProps } from "../../../../../types/messaging/MessageTypeComponentProps";

/**
 * This component handles rendering button response types in the footer of a container, under "body" content. See
 * {@link #BodyMessageComponents}.
 */
function FooterButtonComponents(props: MessageTypeComponentProps) {
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID
  );
  const buttonComponents =
    props.message.ui_state.footerLocalMessageItemIDs?.map((nestedMessageID) => {
      const nestedLocalMessage = allMessageItemsByID[nestedMessageID];
      return (
        <MessageTypeComponent
          key={nestedMessageID}
          {...props}
          message={nestedLocalMessage}
          isNestedMessageItem
        />
      );
    });
  const totalButtons = buttonComponents?.length ?? 0;
  const isColumnList = totalButtons > 2;

  return totalButtons ? (
    <div
      className={cx("WACFooterButtonComponents", {
        "WACFooterButtonComponents--column": isColumnList,
      })}
    >
      {buttonComponents}
    </div>
  ) : null;
}

export { FooterButtonComponents };

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
import { useSelector } from "../../../hooks/useSelector";

import { AppState } from "../../../../types/state/AppState";
import { MessageTypeComponentProps } from "../../../../types/messaging/MessageTypeComponentProps";
import { MessageResponseTypes } from "../../../../types/messaging/Messages";

interface BodyMessageComponentsProps extends MessageTypeComponentProps {
  renderMessageComponent: (
    props: MessageTypeComponentProps & {
      message: any;
      isNestedMessageItem: boolean;
    },
  ) => React.ReactNode;
}

/**
 * This component handles rendering nested messages for response types that have a "body" property.
 */
function BodyMessageComponents(props: BodyMessageComponentsProps) {
  const { bodyLocalMessageItemIDs } = props.message.ui_state;
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID,
  );

  // Loop through the list of supported local message ids and return a message component for each.
  const messageComponents = bodyLocalMessageItemIDs?.map(
    (nestedMessageID, index) => {
      const nestedLocalMessage = allMessageItemsByID[nestedMessageID];
      const isFullWidthMessage = isFullWidthResponseType(
        nestedLocalMessage.item.response_type,
      );
      // Determine if the next message is a full width message, or not. Messages next to each other that aren't full
      // width should have small bottom padding separating them.
      const nextLocalMessageID = bodyLocalMessageItemIDs[index + 1];
      const nextLocalMessage = allMessageItemsByID[nextLocalMessageID];
      const isNextMessageFullWidth = isFullWidthResponseType(
        nextLocalMessage?.item.response_type,
      );

      const isLastElement = index === bodyLocalMessageItemIDs.length - 1;
      const withShortBottomPadding =
        !isLastElement && !isFullWidthMessage && !isNextMessageFullWidth;

      return (
        <div
          key={nestedMessageID}
          className={cx(
            "cds-aichat--body-message-components__message-wrapper",
            {
              "cds-aichat--body-message-components__message-wrapper--full-width":
                isFullWidthMessage,
              "cds-aichat--body-message-components__message-wrapper--short-bottom-padding":
                withShortBottomPadding,
            },
          )}
        >
          {props.renderMessageComponent({
            ...props,
            message: nestedLocalMessage,
            isNestedMessageItem: true,
          })}
        </div>
      );
    },
  );

  if (!messageComponents?.length) {
    return null;
  }

  return (
    <div className="cds-aichat--body-message-components">
      {messageComponents}
    </div>
  );
}

/**
 * Determines if the given response type should be rendered in full width.
 */
function isFullWidthResponseType(responseType: string) {
  switch (responseType) {
    case MessageResponseTypes.IMAGE:
    case MessageResponseTypes.IFRAME:
    case MessageResponseTypes.VIDEO:
    case MessageResponseTypes.AUDIO:
    case MessageResponseTypes.USER_DEFINED:
      return true;
    default:
      return false;
  }
}

const BodyMessageTypeComponentsExport = React.memo(BodyMessageComponents);

export { BodyMessageTypeComponentsExport as BodyMessageComponents };

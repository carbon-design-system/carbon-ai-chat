/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Card from "@carbon/ai-chat-components/es/react/card.js";
import cx from "classnames";
import React from "react";

import { useSelector } from "../../../hooks/useSelector";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { selectInputState } from "../../../store/selectors";
import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { THROW_ERROR } from "../../../utils/constants";
import { BodyMessageComponents } from "../../../components/responseTypes/message/BodyMessageComponents";
import { FooterButtonComponents } from "../../../components/responseTypes/button/FooterButtonComponents";
import {
  CardItem,
  MessageResponse,
  WidthOptions,
} from "../../../../types/messaging/Messages";
import { MessageTypeComponentProps } from "../../../../types/messaging/MessageTypeComponentProps";

interface CardItemComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;

  /**
   * If max width should be ignored.
   */
  ignoreMaxWidth?: boolean;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * Function to render message components
   */
  renderMessageComponent: (props: MessageTypeComponentProps) => React.ReactNode;
}

/**
 * This component renders the card response type. A card can be used to author a custom card containing existing
 * response types.
 */
function CardItemComponent(props: CardItemComponentProps) {
  const {
    ignoreMaxWidth,
    localMessageItem,
    fullMessage,
    isMessageForInput,
    requestFocus,
    renderMessageComponent,
  } = props;
  const item = localMessageItem.item as CardItem;
  const serviceManager = useServiceManager();
  const inputState = useSelector(selectInputState);

  return (
    <Card
      className={cx("cds-aichat--card-message-component", {
        "cds-aichat--max-width-small":
          !ignoreMaxWidth && item.max_width === WidthOptions.SMALL,
        "cds-aichat--max-width-medium":
          !ignoreMaxWidth && item.max_width === WidthOptions.MEDIUM,
        "cds-aichat--max-width-large":
          !ignoreMaxWidth && item.max_width === WidthOptions.LARGE,
      })}
    >
      <div slot="body">
        <BodyMessageComponents
          message={localMessageItem}
          originalMessage={fullMessage}
          requestInputFocus={requestFocus}
          disableUserInputs={inputState.isReadonly}
          isMessageForInput={isMessageForInput}
          scrollElementIntoView={THROW_ERROR}
          serviceManager={serviceManager}
          hideFeedback
          showChainOfThought={false}
          allowNewFeedback={false}
          renderMessageComponent={renderMessageComponent}
        />
      </div>
      <div slot="footer">
        <FooterButtonComponents
          message={localMessageItem}
          originalMessage={fullMessage}
          requestInputFocus={requestFocus}
          disableUserInputs={inputState.isReadonly}
          isMessageForInput={isMessageForInput}
          scrollElementIntoView={THROW_ERROR}
          serviceManager={serviceManager}
          hideFeedback
          showChainOfThought={false}
          allowNewFeedback={false}
          renderMessageComponent={renderMessageComponent}
        />
      </div>
    </Card>
  );
}

const CardComponentExport = React.memo(CardItemComponent);

export { CardComponentExport as CardItemComponent };

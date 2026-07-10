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

import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus.js";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem.js";
import { useSelector } from "../../hooks/useSelector.js";
import { useServiceManager } from "../../hooks/useServiceManager.js";
import { selectInputIsReadonly } from "../../store/selectors.js";
import { THROW_ERROR } from "../../utils/constants.js";
import { BodyMessageComponents } from "../../components-legacy/responseTypes/util/BodyMessageComponents.js";
import { FooterButtonComponents } from "../../components-legacy/responseTypes/util/FooterButtonComponents.js";
import {
  CardItem,
  MessageResponse,
  WidthOptions,
} from "../../../types/messaging/Messages.js";
import { MessageTypeComponentProps } from "../../../types/messaging/MessageTypeComponentProps.js";

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
    localMessageItem,
    fullMessage,
    isMessageForInput,
    requestFocus,
    renderMessageComponent,
    ignoreMaxWidth,
  } = props;
  const serviceManager = useServiceManager();
  const isInputReadonly = useSelector(selectInputIsReadonly);
  const item = localMessageItem.item as CardItem;
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
          disableUserInputs={isInputReadonly}
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
          disableUserInputs={isInputReadonly}
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

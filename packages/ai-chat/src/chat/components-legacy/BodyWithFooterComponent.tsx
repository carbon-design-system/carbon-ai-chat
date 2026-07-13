/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { useSelector } from "../hooks/useSelector";

import { useServiceManager } from "../hooks/useServiceManager";
import { selectInputIsReadonly } from "../store/selectors";
import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import { THROW_ERROR } from "../utils/constants";
import { BodyMessageComponents } from "./responseTypes/util/BodyMessageComponents";
import { FooterButtonComponents } from "./responseTypes/util/FooterButtonComponents";
import { MessageResponse } from "../../types/messaging/Messages";
import { MessageTypeComponentProps } from "../../types/messaging/MessageTypeComponentProps";

interface BodyWithFooterComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;

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
 * This component handles rendering nested message items for response types with "body" and "footer" support.
 */
function BodyWithFooterComponent({
  localMessageItem,
  fullMessage,
  isMessageForInput,
  requestFocus,
  renderMessageComponent,
}: BodyWithFooterComponentProps) {
  const serviceManager = useServiceManager();
  const isInputReadonly = useSelector(selectInputIsReadonly);

  return (
    <>
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
    </>
  );
}

export { BodyWithFooterComponent };

export default BodyWithFooterComponent;

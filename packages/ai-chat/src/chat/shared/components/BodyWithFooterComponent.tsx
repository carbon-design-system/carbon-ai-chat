/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { useSelector } from "react-redux";

import { useLanguagePack } from "../hooks/useLanguagePack";
import { useServiceManager } from "../hooks/useServiceManager";
import { selectInputState } from "../store/selectors";
import { AppState } from "../../../types/state/AppState";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../types/messaging/LocalMessageItem";
import { THROW_ERROR } from "../utils/constants";
import { BodyMessageComponents } from "./responseTypes/util/BodyMessageComponents";
import { FooterButtonComponents } from "./responseTypes/util/FooterButtonComponents";
import { MessageResponse } from "../../../types/messaging/Messages";

interface BodyWithFooterComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;
}

/**
 * This component handles rendering nested message items for response types with "body" and "footer" support.
 */
function BodyWithFooterComponent({
  localMessageItem,
  fullMessage,
  isMessageForInput,
  requestFocus,
}: BodyWithFooterComponentProps) {
  const serviceManager = useServiceManager();
  const languagePack = useLanguagePack();
  const appConfig = useSelector((state: AppState) => state.config);
  const inputState = useSelector(selectInputState);

  return (
    <>
      <BodyMessageComponents
        message={localMessageItem}
        originalMessage={fullMessage}
        languagePack={languagePack}
        requestInputFocus={requestFocus}
        disableUserInputs={inputState.isReadonly}
        config={appConfig}
        isMessageForInput={isMessageForInput}
        scrollElementIntoView={THROW_ERROR}
        serviceManager={serviceManager}
        hideFeedback
        allowNewFeedback={false}
      />
      <FooterButtonComponents
        message={localMessageItem}
        originalMessage={fullMessage}
        languagePack={languagePack}
        requestInputFocus={requestFocus}
        disableUserInputs={inputState.isReadonly}
        config={appConfig}
        isMessageForInput={isMessageForInput}
        scrollElementIntoView={THROW_ERROR}
        serviceManager={serviceManager}
        hideFeedback
        allowNewFeedback={false}
      />
    </>
  );
}

export { BodyWithFooterComponent };

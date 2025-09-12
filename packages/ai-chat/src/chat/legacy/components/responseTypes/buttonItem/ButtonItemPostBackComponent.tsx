/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Send16 from "@carbon/icons/es/send/16.js";
import { carbonIconToReact } from "../../../../utils/carbonIcon";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";

import { useServiceManager } from "../../../../hooks/useServiceManager";
import { selectInputState } from "../../../../store/selectors";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { WA_CONSOLE_PREFIX } from "../../../../utils/constants";
import { createMessageRequestForButtonItemOption } from "../../../../utils/messageUtils";
import { consoleError } from "../../../../utils/miscUtils";
import actions from "../../../../store/actions";
import { MessageSendSource } from "../../../../../types/events/eventBusTypes";
import { ButtonItem } from "../../../../../types/messaging/Messages";
import { BaseButtonItemComponent } from "./BaseButtonItemComponent";

interface ButtonItemPostBackComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem<ButtonItem>;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;
}

/**
 * This component is for a button response type where the button_type is "post_back" that can send a message request
 * to the assistant. When the button is clicked, it gets disabled.
 */
function ButtonItemPostBackComponent({
  localMessageItem,
  requestFocus,
  isMessageForInput,
}: ButtonItemPostBackComponentProps) {
  const serviceManager = useServiceManager();
  const Send = carbonIconToReact(Send16);
  const messageItem = localMessageItem.item;
  const { ui_state, fullMessageID } = localMessageItem;
  const { image_url, alt_text, label, kind } = messageItem;
  const inputState = useSelector(selectInputState);
  const isDisabled =
    !isMessageForInput ||
    Boolean(ui_state.optionSelected) ||
    inputState.isReadonly;

  const onClickHandler = useCallback(() => {
    const isInputAvailable = Boolean(messageItem.value?.input?.text || label);

    if (isInputAvailable) {
      const messageRequest = createMessageRequestForButtonItemOption(
        messageItem,
        fullMessageID,
      );

      requestFocus();
      serviceManager.store.dispatch(
        actions.messageSetOptionSelected(ui_state.id, messageRequest),
      );
      serviceManager.actions.sendWithCatch(
        messageRequest,
        MessageSendSource.POST_BACK_BUTTON,
      );
    } else {
      consoleError(
        `${WA_CONSOLE_PREFIX} post_back button with label "${messageItem.label}" has no input message to send.`,
      );
    }
  }, [
    messageItem,
    label,
    fullMessageID,
    requestFocus,
    serviceManager.store,
    serviceManager.actions,
    ui_state.id,
  ]);

  return (
    <BaseButtonItemComponent
      imageURL={image_url}
      altText={alt_text}
      label={label}
      kind={kind}
      onClick={onClickHandler}
      renderIcon={(image_url && Send) || undefined}
      disabled={isDisabled}
    />
  );
}

export { ButtonItemPostBackComponent };

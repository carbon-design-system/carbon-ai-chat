/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { ButtonItemCustomEventComponent } from "./ButtonItemCustomEventComponent";
import { ButtonItemPostBackComponent } from "./ButtonItemPostBackComponent";
import { ButtonItemShowPanelComponent } from "./ButtonItemShowPanelComponent";
import { ButtonItemURLComponent } from "./ButtonItemURLComponent";
import {
  ButtonItem,
  ButtonItemType,
  MessageResponse,
} from "../../../../types/messaging/Messages";

interface ButtonItemComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem<ButtonItem>;
  fullMessage: MessageResponse;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;
}

/**
 * This component determines the button response type to render.
 */
function ButtonItemComponent(props: ButtonItemComponentProps) {
  switch (props.localMessageItem.item.button_type) {
    case ButtonItemType.URL:
      return (
        <ButtonItemURLComponent localMessageItem={props.localMessageItem} />
      );
    case ButtonItemType.SHOW_PANEL:
      return (
        <ButtonItemShowPanelComponent
          localMessageItem={props.localMessageItem}
          isMessageForInput={props.isMessageForInput}
        />
      );
    case ButtonItemType.CUSTOM_EVENT:
      return (
        <ButtonItemCustomEventComponent
          localMessageItem={props.localMessageItem}
          fullMessage={props.fullMessage}
        />
      );
    default:
      return (
        <ButtonItemPostBackComponent
          localMessageItem={props.localMessageItem}
          requestFocus={props.requestFocus}
          isMessageForInput={props.isMessageForInput}
        />
      );
  }
}

export { ButtonItemComponent };

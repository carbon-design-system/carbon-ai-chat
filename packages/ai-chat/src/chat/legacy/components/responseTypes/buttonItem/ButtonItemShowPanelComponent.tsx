/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ArrowRight16 from "@carbon/icons/es/arrow--right/16.js";
import { carbonIconToReact } from "../../../../utils/carbonIcon";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";

import { useServiceManager } from "../../../../hooks/useServiceManager";
import actions from "../../../../store/actions";
import { selectInputState } from "../../../../store/selectors";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { ButtonItem } from "../../../../../types/messaging/Messages";
import { BaseButtonItemComponent } from "./BaseButtonItemComponent";

interface ButtonItemShowPanelComponentProps {
  localMessageItem: LocalMessageItem<ButtonItem>;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;
}

/**
 * This component is for a button response type where the button_type is "show_panel". This component is a button
 * opens a panel when clicked. The panel content is authored similarly to normal response types, but instead of
 * appearing in the chat they appear in a panel under the "panel.body" or "panel.footer" property.
 */
function ButtonItemShowPanelComponent({
  localMessageItem,
  isMessageForInput,
}: ButtonItemShowPanelComponentProps) {
  const serviceManager = useServiceManager();
  const { image_url, alt_text, label, kind } = localMessageItem.item;
  const inputState = useSelector(selectInputState);
  const ArrowRight = carbonIconToReact(ArrowRight16);
  const isDisabled = inputState.isReadonly;

  /**
   * Once the button is clicked, render the panel content and update the message history to remember the panel being.
   */
  const onClickHandler = useCallback(async () => {
    serviceManager.store.dispatch(actions.setResponsePanelIsOpen(true));
    serviceManager.store.dispatch(
      actions.setResponsePanelContent(localMessageItem, isMessageForInput),
    );
  }, [localMessageItem, isMessageForInput, serviceManager]);

  return (
    <BaseButtonItemComponent
      className="BaseButtonItemComponent__ShowPanel"
      imageURL={image_url}
      altText={alt_text}
      label={label}
      kind={kind}
      renderIcon={(image_url && ArrowRight) || undefined}
      onClick={onClickHandler}
      disabled={isDisabled}
    />
  );
}

export { ButtonItemShowPanelComponent };

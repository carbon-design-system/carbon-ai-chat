/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import TouchInteraction16 from "@carbon/icons/es/touch--interaction/16.js";
import { carbonIconToReact } from "../../../../utils/carbonIcon";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";

import { useServiceManager } from "../../../../hooks/useServiceManager";
import { selectInputState } from "../../../../store/selectors";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import {
  ButtonItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";
import { BusEventType } from "../../../../../types/events/eventBusTypes";
import { BaseButtonItemComponent } from "./BaseButtonItemComponent";

/**
 * This component is for a button response type where the button_type is "custom_event" that fires an event when
 * clicked that developers can hook into.
 */
function ButtonItemCustomEventComponent({
  localMessageItem,
  fullMessage,
}: {
  localMessageItem: LocalMessageItem<ButtonItem>;
  fullMessage: MessageResponse;
}) {
  const serviceManager = useServiceManager();
  const messageItem = localMessageItem.item;
  const { ui_state } = localMessageItem;
  const { image_url, alt_text, label, kind, value } = messageItem;
  const inputState = useSelector(selectInputState);
  const isDisabled =
    Boolean(value && ui_state.optionSelected) || inputState.isReadonly;
  const TouchInteraction = carbonIconToReact(TouchInteraction16);

  const onClickHandler = useCallback(async () => {
    await serviceManager.fire({
      type: BusEventType.MESSAGE_ITEM_CUSTOM,
      messageItem,
      fullMessage,
    });
  }, [messageItem, serviceManager, fullMessage]);

  return (
    <BaseButtonItemComponent
      imageURL={image_url}
      altText={alt_text}
      label={label}
      kind={kind}
      disabled={isDisabled}
      renderIcon={(image_url && TouchInteraction) || undefined}
      onClick={onClickHandler}
    />
  );
}

export { ButtonItemCustomEventComponent };

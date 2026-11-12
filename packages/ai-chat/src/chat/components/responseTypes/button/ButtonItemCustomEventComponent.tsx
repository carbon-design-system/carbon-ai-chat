/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import TouchInteraction16 from '@carbon/icons/es/touch--interaction/16.js';
import {
  carbonIconToReact,
  customIconToReact,
} from '../../../utils/carbonIcon';
import React, { useCallback } from 'react';
import { useSelector } from '../../../hooks/useSelector';

import { useServiceManager } from '../../../hooks/useServiceManager';
import { selectInputIsReadonly } from '../../../../sdk/store/selectors';
import { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import {
  ButtonItem,
  MessageRequest,
  MessageResponse,
} from '../../../../types/messaging/Messages';
import { BusEventType } from '../../../../types/events/eventBusTypes';
import { BaseButtonItemComponent } from './BaseButtonItemComponent';

/**
 * This component is for a button response type where the button_type is "custom_event" that fires an event when
 * clicked that developers can hook into.
 */
function ButtonItemCustomEventComponent({
  localMessageItem,
  fullMessage,
  optionSelected,
}: {
  localMessageItem: LocalMessageItem<ButtonItem>;
  fullMessage: MessageResponse;
  /** The request recorded for the button, from the item's view flags. */
  optionSelected?: MessageRequest;
}) {
  const serviceManager = useServiceManager();
  const messageItem = localMessageItem.item;
  const { image_url, alt_text, label, kind, value, size, is, icon } =
    messageItem;
  const isInputReadonly = useSelector(selectInputIsReadonly);
  const isDisabled = Boolean(value && optionSelected) || isInputReadonly;
  const TouchInteraction = carbonIconToReact(TouchInteraction16);
  const CustomIcon = customIconToReact(icon);

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
      size={size}
      is={is}
      disabled={isDisabled}
      renderIcon={CustomIcon || (image_url && TouchInteraction) || undefined}
      onClick={onClickHandler}
    />
  );
}

export { ButtonItemCustomEventComponent };

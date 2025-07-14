/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MenuItemRadioGroup } from "@carbon/react";
import React from "react";

import { ChatHeaderGroupMenuItem } from "../../../../types/config/ChatHeaderConfig";

interface ChatHeaderMenuItemRadioGroupProps {
  label: string;

  /**
   * The items in the radio group.
   */
  items: ChatHeaderGroupMenuItem[] | string[];

  /**
   * The item to set as selected by default.
   */
  defaultSelectedItem: ChatHeaderGroupMenuItem | string;

  /**
   * The item that is currently selected.
   */
  selectedItem?: ChatHeaderGroupMenuItem | string;

  /**
   * The callback function to fire when an item is selected.
   */
  onChange?: (groupMenuItem: ChatHeaderGroupMenuItem | string) => void;
}

/**
 * This component renders the Carbon MenuItemRadioGroup component specifically in the {@link ChatHeaderMenu} component.
 */
function ChatHeaderMenuItemRadioGroup(
  props: ChatHeaderMenuItemRadioGroupProps
) {
  const { label, items, defaultSelectedItem, selectedItem, onChange } = props;
  return (
    <MenuItemRadioGroup
      label={label}
      items={items}
      defaultSelectedItem={defaultSelectedItem}
      selectedItem={selectedItem}
      onChange={(selectedItem: any) => {
        // The onChange callback gets fired twice. Check if the object returned does not contain an onFocus event
        // object method.
        if (!selectedItem.preventDefault) {
          onChange(selectedItem);
        }
      }}
      itemToString={(menuItem: ChatHeaderGroupMenuItem | string) =>
        typeof menuItem === "string"
          ? menuItem
          : menuItem.label || menuItem.value
      }
    />
  );
}

export { ChatHeaderMenuItemRadioGroup };

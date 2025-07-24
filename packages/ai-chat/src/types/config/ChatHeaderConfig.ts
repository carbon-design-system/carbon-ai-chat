/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The types of elements that can be added to the chat header element.
 *
 * @category Config
 */
export enum ChatHeaderObjectType {
  LINK = "link", // A link button to render in the chat header.
  MENU = "menu", // A menu to create a list of other chat header obejct types.
  BUTTON = "button", // A button to render in the chat header for custom interactions.
  RADIO_GROUP = "radio-group", // A radio group for displaying selectable menu items as redio options.
}

/**
 * The discriminating union of all the possible chat header object types.
 */
interface ChatHeaderObject {
  /**
   * The chat header object type.
   */
  type: ChatHeaderObjectType;

  /**
   * The text to display on the interactible object.
   */
  label: string;
}

/**
 * Describes the properties of the header link object in the chat header.
 *
 * @category Config
 */
export interface ChatHeaderLink extends ChatHeaderObject {
  type: ChatHeaderObjectType.LINK;

  /**
   * The link target.
   */
  isNewTab: boolean;

  /**
   * The url the user will navigate to when clicking the link.
   */
  url: string;
}

/**
 * Describes the properties and methods of the button object in the chat header.
 *
 * @category Config
 */
export interface ChatHeaderButton extends ChatHeaderObject {
  type: ChatHeaderObjectType.BUTTON;

  /**
   * The callback function to fire when the menu item is clicked.
   */
  onClick: () => void;
}

/**
 * Describes a group menu item object. This object is used for authoring the list of selectable radio group menu items.
 *
 * @category Config
 */
export interface ChatHeaderGroupMenuItem extends ChatHeaderObject {
  /**
   * The menu item value.
   */
  value: string;
}

/**
 * Describes the properties and methods to author a chat header group menu. This groups together menu items that become
 * selectable radio group options.
 *
 * @category Config
 */
export interface ChatHeaderGroupMenu extends ChatHeaderObject {
  type: ChatHeaderObjectType.RADIO_GROUP;

  /**
   * The selectable menu items.
   */
  items: ChatHeaderGroupMenuItem[] | string[];

  /**
   * The default menu item to set as selected.
   */
  defaultSelectedItem: ChatHeaderGroupMenuItem | string;

  /**
   * The callback function to fire when a menu item is clicked.
   */
  onChange: (selectedItem: ChatHeaderGroupMenuItem | string) => void;
}

/**
 * The chat header objects that can be rendered in the chat header menu object.
 *
 * @category Config
 */
export type ChatHeaderMenuItemTypes =
  | ChatHeaderLink
  | ChatHeaderButton
  | ChatHeaderGroupMenu
  | ChatHeaderMenu;

/**
 * Describes the properties and methods of a menu to be rendered in the chat header. This menu object can only render
 * chat header objects as menu items which only supports submenus 1 level deep.
 *
 * @category Config
 */
export interface ChatHeaderMenu extends ChatHeaderObject {
  type: ChatHeaderObjectType.MENU;

  /**
   * The chat header objects to render in the menu.
   */
  items: ChatHeaderMenuItemTypes[];
}

/**
 * The chat header objects that can be rendered in the chat header.
 *
 * @category Config
 *
 * @experimental
 */
export type ChatHeaderObjectTypes =
  | ChatHeaderButton
  | ChatHeaderLink
  | ChatHeaderMenu;

/**
 * @category Config
 */
export interface ChatHeaderConfig {
  /**
   * The chat header title with an optional name after the title.
   */
  headerTitle: {
    /**
     * The chat header title.
     */
    title: string;

    /**
     * The name display after the title.
     */
    name?: string;
  };

  /**
   * The list of chat header items that supplement the platform.
   *
   * @experimental
   */
  left?: ChatHeaderObjectTypes[];

  /**
   * The list of chat header items that supplement the chat.
   *
   * @experimental
   */
  right?: ChatHeaderObjectTypes[];
}

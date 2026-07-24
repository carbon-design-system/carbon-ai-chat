/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ToolbarAction as _ToolbarAction } from "@carbon/ai-chat-components/es/react/toolbar.js";

/**
 * A single custom action button, used by both the chat header toolbar
 * ({@link HeaderConfig.actions}) and the chat input actions row
 * ({@link InputConfig.actions}). Carries the icon, accessible `text` (also the
 * tooltip), an `onClick` handler or `href` link, and optional `disabled` /
 * `danger` / `divider` flags. Set `fixed: true` to keep the action visible
 * rather than collapsing into the overflow menu when space is tight.
 *
 * @category Config
 */
export type ToolbarAction = _ToolbarAction;

/**
 * A single menu option.
 *
 * @category Config
 */
export interface CustomMenuOption {
  /**
   * The text to display for the menu option.
   */
  text: string;

  /**
   * The callback handler to call when the option is selected.
   * Provide either this or `href`, but not both.
   */
  handler?: () => void;

  /**
   * The URL to navigate to when the option is selected.
   * Provide either this or `handler`, but not both.
   */
  href?: string;

  /**
   * The target attribute for the link when using `href`.
   * Defaults to "_self" if not specified.
   * Common values: "_self", "_blank", "_parent", "_top"
   */
  target?: string;

  /**
   * If true, the menu option will be disabled and cannot be selected.
   */
  disabled?: boolean;

  /**
   * Optional data-testid attribute for testing purposes.
   * This allows tests to reliably find and interact with specific menu options.
   */
  testId?: string;
}

/**
 * @category Config
 */
export enum MinimizeButtonIconType {
  /**
   * This shows an "X" icon.
   */
  CLOSE = "close",

  /**
   * This shows a "-" icon.
   */
  MINIMIZE = "minimize",

  /**
   * This shows an icon that indicates that the Carbon AI Chat can be collapsed into a side panel.
   */
  SIDE_PANEL_LEFT = "side-panel-left",

  /**
   * This shows an icon that indicates that the Carbon AI Chat can be collapsed into a side panel.
   */
  SIDE_PANEL_RIGHT = "side-panel-right",

  /**
   * This shows an icon that indicates that the Carbon AI Chat can be collapsed into a side panel.
   */
  SIDE_PANEL_DOWN = "side-panel-down",
}

/**
 * Configuration for the main header of the chat.
 *
 * @category Config
 */
export interface HeaderConfig {
  /**
   * If the chat should supply its own header. Can be false if you have a fullscreen chat or one embedded into a page and
   * you want to only make use of the main application header. Defaults to true.
   */
  isOn?: boolean;

  /**
   * Indicates the icon to use for the close button in the header.
   */
  minimizeButtonIconType?: MinimizeButtonIconType;

  /**
   * Hide the ability to minimize the Carbon AI Chat.
   */
  hideMinimizeButton?: boolean;

  /**
   * If true, shows the restart conversation button in the header of home screen and main chat.
   */
  showRestartButton?: boolean;

  /**
   * The chat header title.
   */
  title?: string;

  /**
   * The name displayed after the title.
   */
  name?: string;

  /**
   * All the currently configured custom menu options.
   */
  menuOptions?: CustomMenuOption[];

  /**
   * Controls whether to show the AI label/slug in the header. Defaults to true.
   *
   * There is currently no version of this that does not include the AI theme
   * blue gradients.
   */
  showAiLabel?: boolean;

  /**
   * Controls whether the default AI label content should be hidden.
   * The default content is only meant to serve as a placeholder and should be
   * replaced with custom content using:
   * {@link WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT} and
   * {@link WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS}.
   * When set to true, all the default ai label content including the deprecated
   * {@link WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT}
   * writeable element will be removed.
   *
   * @default false
   */
  hideDefaultAiLabelContent?: boolean;

  /**
   * Controls whether the header should be constrained to the messages max width
   * (--cds-aichat-messages-max-width) or go full width. When true, the header
   * will be constrained to match the message width. When false (default), the
   * header will span the full width of the chat container.
   *
   * @default false
   */
  hasContentMaxWidth?: boolean;

  /**
   * Custom actions to display in the header toolbar. These actions can overflow
   * into a menu when space is limited.
   *
   * The icon property accepts CarbonIcon objects (from @carbon/web-components) or
   * React icon components (from @carbon/icons-react).
   *
   * Built-in buttons (restart, close) will be appended after these custom actions if
   * configured to be shown. You can, of course, disabled those OOTB icons and replace
   * them with your own.
   */
  actions?: ToolbarAction[];
}

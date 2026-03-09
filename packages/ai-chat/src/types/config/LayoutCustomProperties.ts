/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * These variables map to CSS custom properties used in styling the AI chat interface.
 *
 * Keys map to the underlying `--cds-aichat-*` custom properties.
 *
 * You can use any standard CSS as the value.
 *
 * @category Config
 */
export enum LayoutCustomProperties {
  /**
   * Float layout only.
   *
   * Minimum height of the chat container.
   *
   * Defaults to `calc(100vh - 4rem)`.
   */
  height = "height",

  /**
   * Float layout only.
   *
   * Maximum height of the chat container (float layout).
   *
   * Defaults to `640px`.
   */
  max_height = "max-height",

  /**
   * Float layout only.
   *
   * Width of the chat panel (float layout).
   *
   * Defaults to `min(380px, var(--cds-aichat-max-width))`.
   */
  width = "width",

  /**
   * Float layout only.
   *
   * Minimum height of the chat container.
   *
   * Defaults to `max(150px, calc(min(256px, 100vh) - var(--cds-aichat-bottom-position)))`.
   */
  min_height = "min-height",

  /**
   * Float layout only.
   *
   * Maximum width of the chat container (float layout).
   *
   * Defaults to the inherited value of `--cds-aichat-max-width` (not explicitly set).
   */
  max_width = "max-width",

  /**
   * Float layout only.
   *
   * z-index of the chat overlay or container (float layout).
   *
   * Defaults to `99999`.
   */
  z_index = "z-index",

  /**
   * Float layout only.
   *
   * Distance from the bottom of the viewport for the floating container.
   *
   * Defaults to `48px`.
   */
  bottom_position = "bottom-position",

  /**
   * Float layout only.
   *
   * Distance from the right of the viewport for the floating container.
   *
   * Defaults to `32px`.
   */
  right_position = "right-position",

  /**
   * Float layout only.
   *
   * Distance from the top of the viewport for the floating container.
   *
   * Defaults to `auto`.
   */
  top_position = "top-position",

  /**
   * Float layout only.
   *
   * Distance from the left of the viewport for the floating container.
   *
   * Defaults to `auto`.
   */
  left_position = "left-position",

  /**
   * Float layout only.
   *
   * Default launcher button size.
   *
   * Defaults to `56px`.
   */
  launcher_default_size = "launcher-default-size",

  /**
   * Float layout only.
   *
   * Distance from the bottom of the viewport for the launcher.
   *
   * Defaults to `48px`.
   */
  launcher_position_bottom = "launcher-position-bottom",

  /**
   * Float layout only.
   *
   * Distance from the right of the viewport for the launcher.
   *
   * Defaults to `32px`.
   */
  launcher_position_right = "launcher-position-right",

  /**
   * Float layout only.
   *
   * Extended launcher width.
   *
   * Defaults to `280px`.
   */
  launcher_extended_width = "launcher-extended-width",

  /**
   * Shared token.
   *
   * Maximum width for message content area.
   *
   * Defaults to `672px`.
   */
  messages_max_width = "messages-max-width",

  /**
   * Shared token.
   *
   * Minimum width for message content area.
   *
   * Defaults to `320px`.
   */
  messages_min_width = "messages-min-width",

  /**
   * Shared token.
   *
   * Minimum width for workspace panel.
   *
   * Defaults to `480px`.
   */
  workspace_min_width = "workspace-min-width",

  /*
  /**
   * Shared token.
   *
   * Width of the history / conversation list panel.
   *
   * Defaults to `320px`.
  history_width = "history-width",
   */

  /**
   * Shared token.
   *
   * Maximum width for card components.
   *
   * Defaults to `424px`.
   */
  card_max_width = "card-max-width",

  /**
   * Shared token.
   *
   * Launcher button background color.
   */
  launcher_color_background = "launcher-color-background",

  /**
   * Shared token.
   *
   * Launcher avatar/icon color.
   */
  launcher_color_avatar = "launcher-color-avatar",

  /**
   * Shared token.
   *
   * Launcher hover state background color.
   */
  launcher_color_background_hover = "launcher-color-background-hover",

  /**
   * Shared token.
   *
   * Launcher active state background color.
   */
  launcher_color_background_active = "launcher-color-background-active",

  /**
   * Shared token.
   *
   * Launcher focus border color.
   */
  launcher_color_focus_border = "launcher-color-focus-border",

  /**
   * Shared token.
   *
   * Launcher text color on mobile.
   */
  launcher_mobile_color_text = "launcher-mobile-color-text",

  /**
   * Shared token.
   *
   * Expanded launcher message text color.
   */
  launcher_expanded_message_color_text = "launcher-expanded-message-color-text",

  /**
   * Shared token.
   *
   * Expanded launcher message background color.
   */
  launcher_expanded_message_color_background = "launcher-expanded-message-color-background",

  /**
   * Shared token.
   *
   * Expanded launcher message hover background color.
   */
  launcher_expanded_message_color_background_hover = "launcher-expanded-message-color-background-hover",

  /**
   * Shared token.
   *
   * Expanded launcher message active background color.
   */
  launcher_expanded_message_color_background_active = "launcher-expanded-message-color-background-active",

  /**
   * Shared token.
   *
   * Expanded launcher message focus border color.
   */
  launcher_expanded_message_color_focus_border = "launcher-expanded-message-color-focus-border",

  /**
   * Shared token.
   *
   * Unread indicator background color.
   */
  unread_indicator_color_background = "unread-indicator-color-background",

  /**
   * Shared token.
   *
   * Unread indicator text color.
   */
  unread_indicator_color_text = "unread-indicator-color-text",
}

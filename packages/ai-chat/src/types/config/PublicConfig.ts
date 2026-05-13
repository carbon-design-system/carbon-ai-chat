/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HomeScreenConfig } from "./HomeScreenConfig";
import type {
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ServiceDeskPublicConfig,
} from "./ServiceDeskConfig";
import { LauncherConfig } from "./LauncherConfig";
import { DeepPartial } from "../utilities/DeepPartial";
import type { KeyboardShortcuts } from "./ShortcutConfig";
import { CarbonTheme } from "./CarbonTheme";
import { DisclaimerPublicConfig } from "./DisclaimerConfig";
import { HeaderConfig } from "./HeaderConfig";
import { HistoryConfig } from "./HistoryConfig";
import { InputConfig } from "./InputConfig";
import { LanguagePack } from "./LanguagePack";
import { LayoutConfig } from "./LayoutConfig";
import { OnErrorData } from "./ErrorConfig";
import { PublicConfigMessaging } from "./PublicConfigMessaging";
import { UploadConfig } from "./UploadConfig";

/**
 * This file contains the definition for the public application configuration operations that are provided by the
 * host page.
 */

/**
 * Configuration interface for Carbon AI Chat.
 *
 * @category Config
 */
export interface PublicConfig {
  /**
   * This is a one-off listener for catastrophic errors. This is used instead of a normal event bus handler because this function can be
   * defined and called before the event bus has been created.
   */
  onError?: (data: OnErrorData) => void;

  /**
   * By default, the chat window will be rendered in a "closed" state.
   */
  openChatByDefault?: boolean;

  /**
   * Disclaimer screen configuration.
   *
   * If `disclaimerHTML` changes after the disclaimer has been accepted, we request a user to accept again.
   */
  disclaimer?: DisclaimerPublicConfig;

  /**
   * This value is only used when a custom element is being used to render the widget. By default, a number of
   * enhancements to the widget are activated on mobile devices which can interfere with a custom element. This
   * value can be used to disable those enhancements while using a custom element.
   */
  disableCustomElementMobileEnhancements?: boolean;

  /**
   * Add a bunch of noisy console.log messages!
   */
  debug?: boolean;

  /**
   * Expose internal serviceManager on ChatInstance for testing purposes.
   * This should only be used in test environments.
   *
   * @internal
   */
  exposeServiceManagerForTesting?: boolean;

  /**
   * Which Carbon theme tokens to inject. If unset (falsy), the chat inherits tokens from the host page.
   * Set to a specific theme to force token injection.
   */
  injectCarbonTheme?: CarbonTheme;

  /**
   * Enables Carbon AI theme styling. Defaults to true.
   */
  aiEnabled?: boolean;

  /**
   * This is a factory for producing custom implementations of service desks. If this value is set, then this will
   * be used to create an instance of a {@link ServiceDesk} when the user attempts to connect to an agent.
   *
   * If it is changed in the middle of a conversation (you should obviously avoid this) the conversation with the
   * human agent will be disconnected.
   */
  serviceDeskFactory?: (
    parameters: ServiceDeskFactoryParameters,
  ) => Promise<ServiceDesk>;

  /**
   * Any public config to apply to service desks.
   */
  serviceDesk?: ServiceDeskPublicConfig;

  /**
   * If the Carbon AI Chat should grab focus if the chat is open on page load.
   */
  shouldTakeFocusIfOpensAutomatically?: boolean;

  /**
   * An optional namespace that can be added to the Carbon AI Chat that must be 30 characters or under. This value is
   * intended to enable multiple instances of the Carbon AI Chat to be used on the same page. The namespace for this web
   * chat. This value is used to generate a value to append to anything unique (id, session keys, etc) to allow
   * multiple Carbon AI Chats on the same page.
   *
   * Note: this value is used in the aria region label for the Carbon AI Chat. This means this value will be read out loud
   * by users using a screen reader.
   */
  namespace?: string;

  /**
   * Indicates if Carbon AI Chat should sanitize HTML from the assistant.
   */
  shouldSanitizeHTML?: boolean;

  /**
   * Extra config for controlling the behavior of the header.
   */
  header?: HeaderConfig;

  /**
   * The config object for chat history.
   */
  history?: HistoryConfig;

  /**
   * The config object for changing Carbon AI Chat's layout.
   */
  layout?: LayoutConfig;

  /**
   * Config options for controlling messaging.
   */
  messaging?: PublicConfigMessaging;

  /**
   * Sets the chat into a read only mode for displaying old conversations.
   */
  isReadonly?: boolean;

  /**
   * Allows for feedback to persist in all messages, not just the latest message.
   */
  persistFeedback?: boolean;

  /**
   * Sets the name of the assistant. Defaults to "watsonx". Used in screen reader announcements and error messages.
   */
  assistantName?: string;

  /**
   * Sets the URL pointing to a custom avatar for the response author. This image should be a square. If not provided, the default Watsonx icon will be used.
   */
  assistantAvatarUrl?: string;

  /**
   * The locale to use for the widget. This controls the language pack and regional formatting.
   * Example values include: 'en', 'en-us', 'fr', 'es'.
   */
  locale?: string;

  /**
   * Configuration for the homescreen.
   *
   * If you change anything but `is_on` after the chat session has started, the chat will handle it gracefully.
   *
   * If you turn on the homescreen after the user has already started chatting, it will show up in the header as
   * an icon, but the user won't be forced to go back to the homescreen (unlike turning on the disclaimer mid-chat).
   */
  homescreen?: HomeScreenConfig;

  /**
   * Configuration for the launcher.
   */
  launcher?: LauncherConfig;

  /**
   * Configuration for the main input field on the chat.
   */
  input?: InputConfig;

  /**
   * Configuration for file upload behavior in the chat input.
   * When `is_on` is `true`, the chat renders a file attachment button in the input area.
   *
   * @experimental
   */
  upload?: UploadConfig;

  /**
   * Optional partial language pack overrides. Values merge with defaults.
   */
  strings?: DeepPartial<LanguagePack>;

  /**
   * Configuration for keyboard shortcuts in the chat.
   * Allows customization of keyboard shortcuts for various actions.
   *
   * @experimental
   */
  keyboardShortcuts?: KeyboardShortcuts;
}

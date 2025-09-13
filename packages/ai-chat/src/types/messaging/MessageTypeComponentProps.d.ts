/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ScrollElementIntoViewFunction } from "../../chat/components-legacy/MessagesComponent";
import { HasServiceManager } from "../../chat/hocs/withServiceManager";
import { AppConfig } from "../state/AppConfig";
import { HasDisplayOverride } from "../utilities/HasDisplayOverride";
import { HasDoAutoScroll } from "../utilities/HasDoAutoScroll";
import { LanguagePack } from "./LanguagePack";
import { LocalMessageItem } from "./LocalMessageItem";
import { Message } from "./Messages";

interface MessageContextValues
  extends HasServiceManager,
    HasDoAutoScroll,
    HasDisplayOverride {
  originalMessage: Message;
  languagePack: LanguagePack;

  /**
   * A callback function that will request that focus be moved to the main input field.
   */
  requestInputFocus: () => void;

  /**
   * Indicates if any user input controls should be shown but disabled.
   */
  disableUserInputs: boolean;

  /**
   * The configuration for the widget.
   */
  config: AppConfig;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * This is used to scroll elements of messages into view.
   */
  scrollElementIntoView: ScrollElementIntoViewFunction;

  /**
   * Determines if the current message item is an item nested in a response type.
   */
  isNestedMessageItem?: boolean;

  /**
   * We only show chain of thought on the last message.
   */
  showChainOfThought: boolean;

  /**
   * Indicates if all feedback components should be hidden.
   */
  hideFeedback: boolean;

  /**
   * Indicates if this message should permit the user to provide new feedback. The property has no effect if
   * {@link hideFeedback} is false.
   */
  allowNewFeedback: boolean;
}

interface MessageTypeComponentProps extends MessageContextValues {
  /**
   * The local message item that of response type to handle.
   */
  message: LocalMessageItem;
}

export { MessageTypeComponentProps };

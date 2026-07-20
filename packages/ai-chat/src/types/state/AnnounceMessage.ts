/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LanguagePack } from "../config/PublicConfig";

/**
 * This interface represents a piece of text that can be translated using a language pack. A piece of code that
 * needs to display a string from the language pack can specify the ID/Key of the message from the language pack and
 * optionally any parameters that need to be passed to the message formatter that are used inside the string. This
 * also allows a form where the text has already been translated and can be used as-is.
 */
interface AnnounceMessage {
  /**
   * If the text is just specified as text that's already been calculated, that text can just be set here.
   */
  messageText?: string;

  /**
   * If the text is defined by a message id that corresponds to one of the messages in our language pack, that
   * message id can be specified here. The message text will be formatted using this message id.
   */
  messageID?: keyof LanguagePack;

  /**
   * If the text is defined by a message id that corresponds to one of the messages in our language pack, any
   * optional parameters that are necessary for formatting the message with the given id are specified here.
   */
  messageValues?: Record<string, any>;
}

export type { AnnounceMessage };

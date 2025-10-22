/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BLOCKQUOTE,
  CODE,
  HTML,
  MARKDOWN,
  ORDERED_LIST,
  TABLE,
  TEXT,
  UNORDERED_LIST,
} from "@carbon/ai-chat-utils";

const WELCOME_TEXT = `Welcome to this example of a custom back-end. This back-end is harded coded with responses to show a subset of the functionality of Carbon AI Chat.

You can type **help** to see this message again.`;

const CHAIN_OF_THOUGHT_TEXT = `Carbon's versatile bonding properties have been analyzed through multiple chemical databases to present this comprehensive overview.`;

const CHAIN_OF_THOUGHT_TEXT_STREAM = `Carbon's versatile bonding properties have been analyzed through multiple chemical databases to present this comprehensive overview. As this analysis streams in, various computational chemistry tools are querying molecular structures and periodic trends.`;

const WORD_DELAY = 40;

export {
  CHAIN_OF_THOUGHT_TEXT_STREAM,
  CHAIN_OF_THOUGHT_TEXT,
  WELCOME_TEXT,
  TEXT,
  WORD_DELAY,
  TABLE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  BLOCKQUOTE,
  MARKDOWN,
  HTML,
};

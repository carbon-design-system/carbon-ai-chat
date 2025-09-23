/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { FileStatusValue } from "../../../types/instance/apiTypes";
import {
  type IncreaseOrDecrease,
  WriteableElementName,
} from "../../../types/instance/ChatInstance";
import { CornersType } from "../../../types/config/CornersType";

// Prefix used to distinguish console logs omitted from our code
const WA_CONSOLE_PREFIX = "[Chat]";

// The right-to-left mark character string which mixes the direction of a string.
// For more info on right-to-left mark: https://www.w3.org/TR/WCAG20-TECHS/H34.html
const RIGHT_TO_LEFT_MARK = String.fromCharCode(0x200f);

const ENGLISH_US_DATE_FORMAT = "mm/dd/yyyy";

// The timeout, in milliseconds, to wait for a response type to load content.
const RESPONSE_TYPE_TIMEOUT_MS = 20000;

// These are custom panel ids.
const DEFAULT_CUSTOM_PANEL_ID = "wac-default-panel";

/**
 * This function serves as a placeholder in places where a functional value is required, but not expected to be
 * fired. In the event that it is, it will throw an error, letting you know it shouldn't be.
 */
function THROW_ERROR() {
  throw Error("Not implemented.");
}

/**
 * The brand color types configurable for Carbon AI Chat.
 */
enum BrandColorKind {
  PRIMARY = "primary",
  ACCENT = "accent",
}

// When we auto-scroll to a message, we want to scroll a bit more than necessary because messages have a lot of
// padding on the top that we want to cut off when scrolling. This is the extra amount we scroll by. There's 28px of
// padding above the message and we want to cut that down to just 8 so we scroll an extra 20px (28 - 8).
const AUTO_SCROLL_EXTRA = 28 - 8;

// Height of one line message including the message avatar line label
const ONE_LINE_MESSAGE_HEIGHT = 88;

// How much to throttle auto scrolling. When we are in test mode, we set this to zero.
const AUTO_SCROLL_THROTTLE_TIMEOUT = 100;

export {
  AUTO_SCROLL_THROTTLE_TIMEOUT,
  WA_CONSOLE_PREFIX,
  RIGHT_TO_LEFT_MARK,
  ENGLISH_US_DATE_FORMAT,
  RESPONSE_TYPE_TIMEOUT_MS,
  DEFAULT_CUSTOM_PANEL_ID,
  WriteableElementName,
  FileStatusValue,
  THROW_ERROR,
  BrandColorKind,
  CornersType,
  IncreaseOrDecrease,
  AUTO_SCROLL_EXTRA,
  ONE_LINE_MESSAGE_HEIGHT,
};

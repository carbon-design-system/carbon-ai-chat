/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Miscellaneous utilities for dealing with the browser.
 */

import { detect } from "detect-browser";
import memoizeOne from "memoize-one";

const browser = detect();

// The user agent string in version 13 of the operating system no longer distinguishes between macOS and iPads so
// need add an extra check that may not be reliable in the future.
const IS_IPAD =
  /iPad/.test(window.navigator.platform) ||
  (window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1);
const IS_IOS = browser?.os === "iOS";
const IS_ANDROID = browser?.os === "Android OS";
const IS_MOBILE = IS_IOS || IS_ANDROID || IS_IPAD;
// The width and height checks here are how we differentiate between mobile android devices and tablets. Eventually new
// phones may get wide enough that the width check needs to be increased.
const IS_PHONE =
  IS_MOBILE && (window.screen.width < 500 || window.screen.height < 500);
// Assume the phone is in portrait mode if the width is small.
const IS_PHONE_IN_PORTRAIT_MODE = IS_PHONE && window.screen.width < 500;

// For reference here is a list of screen dimensions observed for some of the iPhone devices in browser stack.
//
// 414x896 XS Max
// 414x896 XR
//
// 375x812 XS
// 375x812 X
//
// 414x736 8 Plus
// 414x736 6S Plus
// 414x736 6 Plus
//
// 375x667 8
// 375x667 7
// 375x667 6s
// 375x667 6
//
// 320x568 SE

// This array maps from a screen height on iOS device to a height offset to apply to the widget for devices of that
// height.
const IOS_HEIGHT_MAP = [
  [896, 114],
  [812, 114],
  [736, 75],
  [667, 75],
];

/**
 * This function is responsible for returning a height offset to apply to older iOS devices. On these devices the
 * navigation bars at the top and bottom of the screen consume a portion of the 100vh viewport height which causes
 * the text field to be cut off at the bottom. By applying this offset we make it visible. Unfortunately this offset
 * is different on different devices so we make a guess based on the screen height. Another drawback is that this
 * offset causes a gap to appear below the text field when the navigation bars are hiding.
 */
function getIPhoneHeightOffset() {
  // eslint-disable-next-line no-restricted-globals
  const screenHeight = Math.max(screen.height, screen.width);
  for (let index = 0; index < IOS_HEIGHT_MAP.length; index++) {
    const [height, offset] = IOS_HEIGHT_MAP[index];
    if (screenHeight >= height) {
      return offset;
    }
  }

  return 75;
}

/**
 * In some conditions (iFrames) window.sessionStorage is DEFINED, but not accessible.
 * Rather than doing window.sessionStorage || alternate checks, this actually checks if sessionStorage
 * can be used.
 *
 * @returns If window.sessionStorage is read and writeable.
 */
function isSessionStorageAvailable() {
  let isAvailable = false;
  try {
    window.sessionStorage.setItem("web-chat-test-item", "true");
    window.sessionStorage.getItem("web-chat-test-item");
    window.sessionStorage.removeItem("web-chat-test-item");
    isAvailable = true;
  } catch {
    // Ignore.
  }
  return isAvailable;
}

const IS_SESSION_STORAGE = memoizeOne(isSessionStorageAvailable);

/**
 * Attempts to return the hostname of the provided URL. If an invalid url is returned, we just return the provided url
 * value.
 */
function getURLHostName(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Executes the given operation in a setTimeout if the timeout value is specified. If not, then the operation is
 * executed immediately without using a setTimeout.
 */
function conditionalSetTimeout(operation: () => void, timeout: number) {
  if (timeout) {
    return setTimeout(operation, timeout);
  }
  // Execute the operation immediately.
  operation();
  return null;
}

export {
  IS_IOS,
  IS_MOBILE,
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  getIPhoneHeightOffset,
  IS_SESSION_STORAGE,
  getURLHostName,
  conditionalSetTimeout,
};

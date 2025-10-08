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

import { memoizeFunction } from "./memoizerUtils";

const isBrowser =
  typeof window !== "undefined" && typeof navigator !== "undefined";

let screenWidth = 0;
let screenHeight = 0;

if (isBrowser) {
  screenWidth = window.screen.width;
  screenHeight = window.screen.height;
}

const IS_IOS = isBrowser && /iPad|iPhone|iPod/.test(navigator.userAgent);
const IS_ANDROID = isBrowser && /Android/.test(navigator.userAgent);
const IS_MOBILE = IS_IOS || IS_ANDROID;
// The width and height checks here are how we differentiate between mobile android devices and tablets. Eventually new
// phones may get wide enough that the width check needs to be increased.
const IS_PHONE = IS_MOBILE && (screenWidth < 500 || screenHeight < 500);
// Assume the phone is in portrait mode if the width is small.
const IS_PHONE_IN_PORTRAIT_MODE = IS_PHONE && screenWidth < 500;

/**
 * In some conditions (iFrames) window.sessionStorage is DEFINED, but not accessible.
 * Rather than doing window.sessionStorage || alternate checks, this actually checks if sessionStorage
 * can be used.
 *
 * @returns If window.sessionStorage is read and writeable.
 */
function isSessionStorageAvailable(): boolean {
  if (!isBrowser || !window.sessionStorage) {
    return false;
  }
  try {
    window.sessionStorage.setItem("web-chat-test-item", "true");
    window.sessionStorage.getItem("web-chat-test-item");
    window.sessionStorage.removeItem("web-chat-test-item");
    return true;
  } catch {
    // Ignore.
    return false;
  }
}

const IS_SESSION_STORAGE = memoizeFunction(isSessionStorageAvailable);

/**
 * Attempts to return the hostname of the provided URL. If an invalid url is returned, we just return the provided url
 * value.
 */
function getURLHostName(url: string): string {
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
function conditionalSetTimeout(
  operation: () => void,
  timeout: number,
): ReturnType<typeof setTimeout> | null {
  if (timeout) {
    return setTimeout(operation, timeout);
  }
  operation();
  return null;
}

export {
  isBrowser,
  IS_MOBILE,
  IS_PHONE,
  IS_PHONE_IN_PORTRAIT_MODE,
  IS_SESSION_STORAGE,
  getURLHostName,
  conditionalSetTimeout,
};

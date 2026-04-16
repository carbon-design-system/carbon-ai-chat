/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Device detection utilities.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

let screenWidth = 0;
let screenHeight = 0;

if (isBrowser()) {
  screenWidth = window.screen.width;
  screenHeight = window.screen.height;
}

const IS_IOS = isBrowser() && /iPad|iPhone|iPod/.test(navigator.userAgent);
const IS_ANDROID = isBrowser() && /Android/.test(navigator.userAgent);
const IS_MOBILE = IS_IOS || IS_ANDROID;
// The width and height checks here are how we differentiate between mobile android devices and tablets.
const IS_PHONE = IS_MOBILE && (screenWidth < 500 || screenHeight < 500);
// Assume the phone is in portrait mode if the width is small.
const IS_PHONE_IN_PORTRAIT_MODE = IS_PHONE && screenWidth < 500;

export { IS_IOS, IS_ANDROID, IS_MOBILE, IS_PHONE, IS_PHONE_IN_PORTRAIT_MODE };

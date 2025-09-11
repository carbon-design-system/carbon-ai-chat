/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Miscellaneous utilities that don't fit anywhere else.
 */

import { ErrorInfo } from "react";

import { AppConfig } from "../../../types/state/AppConfig";
import { FileUpload } from "../../../types/state/AppState";
import { FileStatusValue, WA_CONSOLE_PREFIX } from "./constants";
import { resolveOrTimeout } from "./lang/promiseUtils";
import {
  OnErrorData,
  OnErrorType,
  ThemeType,
} from "../../../types/config/PublicConfig";

/**
 * A global flag to indicate if we want to show debug messages in the browser console. This is generally set from
 * {@link PublicConfig.debug}.
 */
let enableDebugLog = false;

/**
 * This is a no-op function that's for the purpose of verifying at build time that a given item matches a given
 * type. To use, pass the item as the "item" parameter and pass the type as the "TItemType" type parameter. Since
 * this is incurring a runtime call for what is really a build-time check, this function should be used sparingly.
 */
function assertType<TItemType>(item: TItemType): TItemType {
  return item;
}

/**
 * A simple utility to send a message to the console log but only id debug logging is enabled.
 */
function debugLog(message: string, ...args: any[]) {
  if (enableDebugLog) {
    console.log(`${WA_CONSOLE_PREFIX} ${message}`, ...args);
  }
}

/**
 * A simple utility to send an error message to the console log.
 */
function consoleError(message: string, ...args: any[]) {
  console.error(`${WA_CONSOLE_PREFIX} ${message}`, ...args);
}

/**
 * A simple utility to send an error message to the console log.
 */
function consoleLog(message: string, ...args: any[]) {
  console.log(`${WA_CONSOLE_PREFIX} ${message}`, ...args);
}

/**
 * A simple utility to send a message to the console log.
 */
function consoleDebug(message: string, ...args: any[]) {
  console.debug(`${WA_CONSOLE_PREFIX} ${message}`, ...args);
}

/**
 * A simple utility to send an warning message to the console log.
 */
function consoleWarn(message: string, ...args: any[]) {
  console.warn(`${WA_CONSOLE_PREFIX} ${message}`, ...args);
}

/**
 * Sets a global flag to indicate if we want to show debug messages in the browser console. This is generally set from
 * {@link PublicConfig.debug}.
 */
function setEnableDebugLog(debug: boolean) {
  enableDebugLog = debug;
}

/**
 * Indicates if the global flag to indicate if we want to show debug messages in the browser console is enabled.
 */
function isEnableDebugLog() {
  return enableDebugLog;
}

/**
 * Safely returns the text from the given fetch response or undefined if there is an error. This will also impose a
 * timeout on getting the text
 */
async function safeFetchTextWithTimeout(response: Response): Promise<string> {
  try {
    if (response) {
      return resolveOrTimeout(response.text(), 2000, "Getting response text");
    }
  } catch (error) {
    consoleError("Error getting fetch text", error);
  }
  return undefined;
}

/**
 * Returns a {@link OnErrorData} that represents an error that occurred while rendering a component.
 */
function createDidCatchErrorData(
  component: string,
  error: Error,
  errorInfo: ErrorInfo,
  isCatastrophicError?: boolean,
): OnErrorData {
  return {
    errorType: OnErrorType.RENDER,
    message: `${component}.componentDidCatch`,
    otherData: {
      error,
      errorInfo,
    },
    catastrophicErrorType: isCatastrophicError,
  };
}

/**
 * This function will calculate and return the necessary top padding percentage value that will help render a media
 * player with a responsive aspect ratio.
 */
function getResponsiveElementPaddingValue(baseHeight = 180) {
  return `${100 / (320 / baseHeight)}%`;
}

/**
 * Indicates if the given file is valid for uploading. The file must still be in the edit step and it must not
 * contain an error.
 */
function isValidForUpload(upload: FileUpload) {
  return upload.status === FileStatusValue.EDIT && !upload.isError;
}

/**
 * Calls the given onError function.
 */
function callOnError(onError: (data: OnErrorData) => void, data: OnErrorData) {
  if (onError) {
    try {
      onError(data);
    } catch (error) {
      consoleError("Error calling onError", error);
    }
  }
}

function getBotName(theme: ThemeType | undefined, config: AppConfig) {
  let botName;
  if (theme === ThemeType.CARBON_AI) {
    botName = "watsonx";
  } else {
    botName = config.public.botName || "watsonx";
  }

  return botName;
}

export {
  assertType,
  debugLog,
  consoleError,
  consoleWarn,
  setEnableDebugLog,
  createDidCatchErrorData,
  consoleDebug,
  consoleLog,
  isEnableDebugLog,
  getResponsiveElementPaddingValue,
  isValidForUpload,
  safeFetchTextWithTimeout,
  callOnError,
  getBotName,
};

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The different categories of errors that the system can record. These values are published for end user consumption.
 *
 * @category Config
 */
export enum OnErrorType {
  /**
   * Indicates an error sending a message to the assistant. This error is only generated after all retries have
   * failed and the system has given up.
   */
  MESSAGE_COMMUNICATION = "MESSAGE_COMMUNICATION",

  /**
   * This indicates an error in one of the components that occurs as part of rendering the UI.
   */
  RENDER = "RENDER",

  /**
   * This indicates a known error with the configuration for a service desk. Fired when a connect_to_agent
   * response type is received, but none is configured.
   */
  INTEGRATION_ERROR = "INTEGRATION_ERROR",

  /**
   * This indicates that some error occurred while trying to hydrate the chat. This will prevent the chat from
   * functioning.
   */
  HYDRATION = "HYDRATION",
}

/**
 * Fired when a serious error in the chat occurs.
 *
 * @category Config
 */
export interface OnErrorData {
  /**
   * The type of error that occurred.
   */
  errorType: OnErrorType;

  /**
   * A message associated with the error.
   */
  message: string;

  /**
   * An extra blob of data associated with the error. This may be a stack trace for thrown errors.
   */
  otherData?: unknown;

  /**
   * If the error is of the severity that requires a whole restart of Carbon AI Chat.
   */
  catastrophicErrorType?: boolean;
}

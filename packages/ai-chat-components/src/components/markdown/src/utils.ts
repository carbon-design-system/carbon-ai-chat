/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

const CONSOLE_PREFIX = "[carbon-ai-chat-components]";

/**
 * Console error with prefix
 */
export function consoleError(message: string, ...args: any[]) {
  console.error(`${CONSOLE_PREFIX} ${message}`, ...args);
}

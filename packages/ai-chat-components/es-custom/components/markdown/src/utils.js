/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
function consoleError(message, ...args) {
    console.error(`${CONSOLE_PREFIX} ${message}`, ...args);
}
/**
 * Console log with prefix
 */
function consoleLog(message, ...args) {
    console.log(`${CONSOLE_PREFIX} ${message}`, ...args);
}

export { consoleError, consoleLog };
//# sourceMappingURL=utils.js.map

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Real browser input for the components browser tests. Each function keeps
// the signature of its `@web/test-runner-commands` namesake and runs the same
// Playwright call on the server (see ./commands.ts).

import { commands } from 'vitest/browser';
import type {
  EmulateMediaPayload,
  SendKeysPayload,
  SendMousePayload,
} from './commands.js';
import type {} from './commands-types.js';

export function sendMouse(payload: SendMousePayload) {
  return commands.caicSendMouse(payload);
}

export function resetMouse() {
  return commands.caicResetMouse();
}

export function sendKeys(payload: SendKeysPayload) {
  return commands.caicSendKeys(payload);
}

export function emulateMedia(payload: EmulateMediaPayload) {
  return commands.caicEmulateMedia(payload);
}

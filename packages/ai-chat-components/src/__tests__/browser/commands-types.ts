/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type {
  EmulateMediaPayload,
  SendKeysPayload,
  SendMousePayload,
} from './commands.js';

declare module 'vitest/browser' {
  interface BrowserCommands {
    caicSendMouse(payload: SendMousePayload): Promise<void>;
    caicResetMouse(): Promise<void>;
    caicSendKeys(payload: SendKeysPayload): Promise<void>;
    caicEmulateMedia(payload: EmulateMediaPayload): Promise<void>;
  }
}

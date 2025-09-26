/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatInstance, PublicConfig } from "@carbon/ai-chat";

declare global {
  interface Window {
    chatInstance?: ChatInstance;
    setChatConfig?: (config: Partial<PublicConfig>) => Promise<void>;
  }
}

export {};

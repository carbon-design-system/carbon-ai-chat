/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "../config/PublicConfig";
import { type ChatInstance } from "../instance/ChatInstance";
import { RenderUserDefinedState } from "./ChatContainer";

interface ManagedWebChat {
  /**
   * The config for the Carbon AI Chat that is loaded.
   */
  config: PublicConfig;

  /**
   * Indicates if this instance of the Carbon AI Chat should be or has been destroyed.
   */
  shouldDestroy: boolean;

  /**
   * The instance of Carbon AI Chat that was loaded.
   */
  instance: ChatInstance;
}

/**
 * Just adding the element we use internally that doesn't get exposed.
 */
interface RenderUserDefinedStateInternal extends RenderUserDefinedState {
  element: HTMLElement;
}

export { ManagedWebChat, RenderUserDefinedStateInternal };

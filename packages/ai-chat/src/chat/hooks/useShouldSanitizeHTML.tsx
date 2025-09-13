/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useSelector } from "./useSelector";

import { AppState } from "../../types/state/AppState";

/**
 * A hook that indicates whether general HTML should be sanitized.
 */
function useShouldSanitizeHTML() {
  const config = useSelector((state: AppState) => state.config.public);

  // We want to sanitize the HTML in all the tooling Carbon AI Chats, in the agent app or if the customer has asked for it.
  return Boolean(config.shouldSanitizeHTML);
}

export { useShouldSanitizeHTML };

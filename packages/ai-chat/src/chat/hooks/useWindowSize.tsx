/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a React hook that will provided access to the current window size and is updated as the window size changes.
 */

import { useContext } from "react";

import { WindowSizeContext } from "../contexts/WindowSizeContext";

function useWindowSize() {
  return useContext(WindowSizeContext);
}

export { useWindowSize };

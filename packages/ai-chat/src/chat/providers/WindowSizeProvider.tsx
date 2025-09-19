/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * WindowSizeProvider
 *
 * Provides the current window size via {@link WindowSizeContext}.
 */

import React, { ReactNode } from "react";
import { WindowSizeContext } from "../contexts/WindowSizeContext";
import type { Dimension } from "../../types/utilities/Dimension";

interface WindowSizeProviderProps {
  windowSize: Dimension;
  children?: ReactNode;
}

function WindowSizeProvider({
  windowSize,
  children,
}: WindowSizeProviderProps): JSX.Element {
  return (
    <WindowSizeContext.Provider value={windowSize}>
      {children}
    </WindowSizeContext.Provider>
  );
}

export { WindowSizeProvider };

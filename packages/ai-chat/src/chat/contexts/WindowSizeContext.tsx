/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { Dimension } from "../../types/utilities/Dimension";

/**
 * This context provides access to the current window size and is updated as the window size changes.
 */

const WindowSizeContext = React.createContext<Dimension>(null);

export { WindowSizeContext };

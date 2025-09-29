/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * StoreContext
 *
 * A minimal React context that holds the current AppStore instance. This mirrors the role that react-redux's
 * `Provider`/`Context` play, but without taking a dependency on react-redux.
 *
 * References (MIT licenses):
 * - Redux: https://github.com/reduxjs/redux (License: https://github.com/reduxjs/redux/blob/master/LICENSE.md)
 * - react-redux: https://github.com/reduxjs/react-redux (License: https://github.com/reduxjs/react-redux/blob/master/LICENSE.md)
 */

import React from "react";
import type { AppStore, UnknownAction } from "../store/appStore";

const StoreContext = React.createContext<AppStore<
  unknown,
  UnknownAction
> | null>(null);

export { StoreContext };

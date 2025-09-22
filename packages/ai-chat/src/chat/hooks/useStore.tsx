/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * useStore
 *
 * Returns the current store from {@link StoreContext}, typed to the caller's desired root state and action types.
 * Mirrors the ergonomics of `react-redux` without a dependency on that package.
 *
 * References (MIT licenses):
 * - Redux: https://github.com/reduxjs/redux (License: https://github.com/reduxjs/redux/blob/master/LICENSE.md)
 * - react-redux: https://github.com/reduxjs/react-redux (License: https://github.com/reduxjs/react-redux/blob/master/LICENSE.md)
 */

import { useContext } from "react";
import type { AppStore, UnknownAction } from "../store/appStore";
import { StoreContext } from "../contexts/StoreContext";

export function useStore<
  RootState,
  ActionType extends UnknownAction = UnknownAction,
>(): AppStore<RootState, ActionType> {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("StoreProvider is missing in the component tree.");
  }
  return store as unknown as AppStore<RootState, ActionType>;
}

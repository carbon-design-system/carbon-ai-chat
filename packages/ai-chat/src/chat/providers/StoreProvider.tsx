/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * StoreProvider
 *
 * Provides the store instance to React descendants via {@link StoreContext}. This mirrors the behavior of
 * react-redux's `Provider`, but does not depend on react-redux.
 *
 * References (MIT licenses):
 * - Redux: https://github.com/reduxjs/redux (License: https://github.com/reduxjs/redux/blob/master/LICENSE.md)
 * - react-redux: https://github.com/reduxjs/react-redux (License: https://github.com/reduxjs/react-redux/blob/master/LICENSE.md)
 */

import React, { ReactNode, useMemo } from "react";
import type { AppStore, UnknownAction } from "../store/appStore";
import { StoreContext } from "../contexts/StoreContext";

export interface StoreProviderProps<
  RootState,
  ActionType extends UnknownAction = UnknownAction,
> {
  /** The store instance to provide to descendants. */
  store: AppStore<RootState, ActionType>;
  /** Children nodes that should have access to the store. */
  children?: ReactNode;
}

export function StoreProvider<
  RootState,
  ActionType extends UnknownAction = UnknownAction,
>({ store, children }: StoreProviderProps<RootState, ActionType>): JSX.Element {
  const value = useMemo(
    () => store as AppStore<unknown, UnknownAction>,
    [store],
  );
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

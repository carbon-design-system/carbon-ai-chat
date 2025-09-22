/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * useDispatch
 *
 * Returns the store's `dispatch` function.
 */

import type { DispatchFunction, UnknownAction } from "../store/appStore";
import { useStore } from "./useStore";

export function useDispatch<
  ActionType extends UnknownAction = UnknownAction,
>(): DispatchFunction<ActionType> {
  const store = useStore<unknown, ActionType>();
  return store.dispatch;
}

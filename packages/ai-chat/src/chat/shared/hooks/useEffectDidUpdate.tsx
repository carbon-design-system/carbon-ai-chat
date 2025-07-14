/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This hook behaves the same as useEffect except that it only runs when the given inputs change (skipping the first
 * effect where the inputs are new).
 */

import { DependencyList, EffectCallback, useEffect, useRef } from "react";

function useEffectDidUpdate(effect: EffectCallback, deps?: DependencyList) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return effect();
    }
    hasRunRef.current = true;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export { useEffectDidUpdate };

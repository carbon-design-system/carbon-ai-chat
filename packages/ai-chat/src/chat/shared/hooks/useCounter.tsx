/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useRef } from "react";

let nextNumber = 1;

/**
 * A hook that returns a counter that increases by one for each component it is used in.
 */
function useCounter() {
  const counterRef = useRef<number>();
  if (counterRef.current === undefined) {
    counterRef.current = nextNumber++;
  }

  return counterRef.current;
}

export { useCounter };

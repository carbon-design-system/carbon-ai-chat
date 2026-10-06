/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useRef } from 'react';

import { nextCounter } from '../utils/counter';

/**
 * A hook that returns a counter that increases by one for each component it is used in.
 */
function useCounter() {
  const counterRef = useRef<number>(undefined);
  if (counterRef.current === undefined) {
    counterRef.current = nextCounter();
  }

  return counterRef.current;
}

export { useCounter };

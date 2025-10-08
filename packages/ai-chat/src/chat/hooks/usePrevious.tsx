/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useRef } from "react";

/**
 * A custom react hook to be able to set and access previous prop/state values:
 * see https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
 */
function usePrevious(value: any) {
  const ref = useRef(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export { usePrevious };

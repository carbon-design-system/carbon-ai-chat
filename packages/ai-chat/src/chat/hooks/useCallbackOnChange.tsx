/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import debounce from "lodash-es/debounce.js";
import { useMemo } from "react";

import { usePrevious } from "./usePrevious";

/**
 * This hooks will observe the given value and will call the given function when the chunks have changed.
 */
function useCallbackOnChange(value: any, callback: () => void) {
  const doDebounced = useMemo(() => {
    return callback && debounce(callback, 100, { maxWait: 100, leading: true });
  }, [callback]);

  if (usePrevious(value) !== value && callback) {
    setTimeout(doDebounced);
  }
}

export { useCallbackOnChange };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This hooks runs once when a component is first mounted. It's main purpose is to hide the eslint warning without
 * risking someone using the callback with values that could change after mounting.
 */

import { EffectCallback, useEffect } from "react";

const useOnMount = (callback: EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, []);
};

export { useOnMount };

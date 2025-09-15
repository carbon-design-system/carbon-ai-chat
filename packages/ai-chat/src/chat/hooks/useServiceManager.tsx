/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a React hook that will provided access to the {@link ServiceManager}.
 */

import { useContext } from "react";

import { ServiceManagerContext } from "../contexts/ServiceManagerContext";

function useServiceManager() {
  return useContext(ServiceManagerContext);
}

export { useServiceManager };

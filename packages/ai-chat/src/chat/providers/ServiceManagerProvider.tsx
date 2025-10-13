/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * ServiceManagerProvider
 *
 * Provides the {@link ServiceManager} instance via {@link ServiceManagerContext}.
 */

import React, { ReactNode, type JSX } from "react";
import { ServiceManagerContext } from "../contexts/ServiceManagerContext";
import { ServiceManager } from "../services/ServiceManager";

interface ServiceManagerProviderProps {
  /** The service manager instance to provide. */
  serviceManager: ServiceManager;
  /** Children that should have access to the service manager. */
  children?: ReactNode;
}

function ServiceManagerProvider({
  serviceManager,
  children,
}: ServiceManagerProviderProps): JSX.Element {
  return (
    <ServiceManagerContext.Provider value={serviceManager}>
      {children}
    </ServiceManagerContext.Provider>
  );
}

export { ServiceManagerProvider };

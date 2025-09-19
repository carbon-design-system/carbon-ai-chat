/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a high order component that will inject a {@link ServiceManager} in to a component.
 */

import React, { useContext } from "react";

import { ServiceManagerContext } from "../contexts/ServiceManagerContext";
import { ServiceManager } from "../services/ServiceManager";

/**
 * A simple interface that represents an injected service manager.
 */
interface HasServiceManager {
  /**
   * The service manager that was injected.
   */
  serviceManager: ServiceManager;
}

function withServiceManager<P extends HasServiceManager>(
  Component: React.ComponentType<P>,
) {
  // 1. OuterProps = everything in P except serviceManager
  type OuterProps = Omit<P, "serviceManager">;

  // 2. Tell forwardRef what ref type (here unknown) and what props (OuterProps) look like
  const Wrapped = React.forwardRef<unknown, OuterProps>((props, ref) => {
    const serviceManager = useContext(ServiceManagerContext);
    return (
      <Component
        {...(props as unknown as P)}
        ref={ref}
        serviceManager={serviceManager}
      />
    );
  });

  // 3. (Optional) for better React DevTools display
  Wrapped.displayName = `withServiceManager(${
    Component.displayName || Component.name || "Component"
  })`;

  return Wrapped;
}

export { withServiceManager, ServiceManagerContext, HasServiceManager };

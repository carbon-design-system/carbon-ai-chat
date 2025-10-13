/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * ModalPortalRootProvider
 *
 * Provides the modal portal host element to descendants via {@link ModalPortalRootContext}.
 */

import React, { ReactNode, type JSX } from "react";
import { ModalPortalRootContext } from "../contexts/ModalPortalRootContext";

interface ModalPortalRootProviderProps {
  hostElement: Element;
  children?: ReactNode;
}

function ModalPortalRootProvider({
  hostElement,
  children,
}: ModalPortalRootProviderProps): JSX.Element {
  return (
    <ModalPortalRootContext.Provider value={hostElement}>
      {children}
    </ModalPortalRootContext.Provider>
  );
}

export { ModalPortalRootProvider };

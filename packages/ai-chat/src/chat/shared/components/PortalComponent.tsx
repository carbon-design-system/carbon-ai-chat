/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ReactNode } from "react";
import ReactDOM from "react-dom";

/**
 * Just a simple component that mounts to a host element.
 */
function PortalComponent({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode;
}) {
  return hostElement ? ReactDOM.createPortal(children, hostElement) : null;
}

export { PortalComponent };

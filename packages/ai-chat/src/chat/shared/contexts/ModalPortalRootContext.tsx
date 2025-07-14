/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

/**
 * This context provides access to the portal root element that acts as the host element for instances of
 * {@link ModalPortal}. Instances of that react component are mounted here in the DOM using React's portal
 * functionality.
 */

const ModalPortalRootContext = React.createContext<Element>(null);

export { ModalPortalRootContext };

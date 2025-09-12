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
 * This file contains the context used by the {@link HideComponent} which is used to indicate if the component is
 * hidden or not. The value in the context is a boolean that is true if the component is hidden.
 */

const HideComponentContext = React.createContext<boolean>(false);

export { HideComponentContext };

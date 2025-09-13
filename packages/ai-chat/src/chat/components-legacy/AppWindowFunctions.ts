/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HasRequestFocus } from "../../types/utilities/HasRequestFocus";

/**
 * These are the public imperative functions that are available on the App component. This interface is
 * declared separately to avoid a direct dependency on a React component.
 */
type AppWindowFunctions = HasRequestFocus;

export { AppWindowFunctions };

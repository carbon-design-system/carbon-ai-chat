/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createContext } from "react";
import { IntlShape } from "../utils/i18n";

/**
 * React context for providing i18n formatter throughout the component tree.
 * This replaces react-intl's IntlContext.
 *
 * @example
 * ```typescript
 * import { IntlContext } from './contexts/IntlContext';
 * import { createIntl } from './utils/i18n';
 *
 * const formatter = createIntl({ locale: 'en', messages });
 *
 * <IntlContext.Provider value={formatter}>
 *   <App />
 * </IntlContext.Provider>
 * ```
 */
export const IntlContext = createContext<IntlShape | null>(null);

IntlContext.displayName = "IntlContext";

// Made with Bob

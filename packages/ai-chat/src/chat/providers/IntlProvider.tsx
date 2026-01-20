/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * IntlProvider
 *
 * Custom i18n provider that replaces react-intl's RawIntlProvider.
 * This is framework-agnostic and prepares for web components migration.
 */

import React, { ReactNode, type JSX } from "react";
import { IntlContext } from "../contexts/IntlContext";
import { IntlShape } from "../utils/i18n";

interface IntlProviderProps {
  /**
   * The i18n formatter instance created by createIntl()
   */
  intl: IntlShape;

  /**
   * Child components that will have access to i18n
   */
  children?: ReactNode;
}

/**
 * Provider component that makes i18n formatter available to all child components.
 * This replaces react-intl's RawIntlProvider.
 *
 * @example
 * ```typescript
 * import { IntlProvider } from './providers/IntlProvider';
 * import { createIntl } from './utils/i18n';
 * import enMessages from './languages/en.json';
 *
 * const formatter = createIntl({ locale: 'en', messages: enMessages });
 *
 * function App() {
 *   return (
 *     <IntlProvider intl={formatter}>
 *       <YourComponents />
 *     </IntlProvider>
 *   );
 * }
 * ```
 */
function IntlProvider({ intl, children }: IntlProviderProps): JSX.Element {
  return <IntlContext.Provider value={intl}>{children}</IntlContext.Provider>;
}

export { IntlProvider };
export type { IntlProviderProps };

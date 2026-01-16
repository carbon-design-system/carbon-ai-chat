/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useContext } from "react";
import { IntlContext } from "../contexts/IntlContext";
import { IntlShape } from "../utils/i18n";

/**
 * React hook to access the i18n formatter.
 * This replaces react-intl's useIntl() hook.
 *
 * @returns The IntlShape instance from context
 * @throws Error if used outside of IntlProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { formatMessage, formatDate } = useIntl();
 *
 *   return (
 *     <div>
 *       <h1>{formatMessage('window_title')}</h1>
 *       <p>{formatDate(new Date())}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntl(): IntlShape {
  const formatter = useContext(IntlContext);

  if (!formatter) {
    throw new Error(
      "useIntl must be used within an IntlProvider. " +
        "Make sure your component is wrapped with <IntlProvider>.",
    );
  }

  return formatter;
}

// Made with Bob

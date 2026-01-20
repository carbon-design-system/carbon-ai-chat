/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IntlShape } from "../../chat/utils/i18n";

/**
 * A simple interface for objects that have a reference to an injected intl property.
 * This has been updated to use our custom IntlShape instead of react-intl's IntlShape.
 *
 * Note: This interface is primarily used for legacy components that used injectIntl HOC.
 * New components should use the useIntl() hook instead.
 */

interface HasIntl {
  /**
   * An injected "intl" property containing the i18n formatter.
   */
  intl: IntlShape;
}

export default HasIntl;

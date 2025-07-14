/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IntlShape } from "react-intl";

/**
 * A simple interface for objects that have a reference to an injected intl property from react-intl. This interface
 * is equivalent to "WrappedComponentProps" from their library but that name is lame and could easily conflict with
 * other names from other libraries. Also the fact that it uses a variable property name makes my editor less smart
 * about type checking this value so we'll just define an interface that's got the property name already set.
 */

interface HasIntl {
  /**
   * An injected "intl" property.
   */
  intl: IntlShape;
}

export default HasIntl;

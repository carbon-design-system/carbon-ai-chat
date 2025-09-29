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
 * Thin wrapper around react-intl's RawIntlProvider to colocate provider components.
 */

import React, { ReactNode } from "react";
import { RawIntlProvider, IntlShape } from "react-intl";

interface IntlProviderProps {
  intl: IntlShape;
  children?: ReactNode;
}

function IntlProvider({ intl, children }: IntlProviderProps): JSX.Element {
  return <RawIntlProvider value={intl}>{children}</RawIntlProvider>;
}

export { IntlProvider };

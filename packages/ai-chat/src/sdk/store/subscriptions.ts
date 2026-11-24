/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains the subscription functions that run against the redux store.
 */

import { ServiceManager } from '../services/ServiceManager';
import isEqual from 'lodash-es/isEqual.js';
import { refreshLocalization } from '../utils/intlUtils';

/**
 * Rebuilds the i18n formatter whenever the active strings or locale change. The
 * `languagePack` slice and `serviceManager.intl` are two sinks for the same
 * strings; deriving `intl` here from the slice (rather than rebuilding it at each
 * dispatch site) makes the slice the single source of truth, so no update path —
 * the separate `strings` prop, `config.strings`, or a runtime locale change — can
 * leave `formatMessage`/`useIntl` consumers stale. A locale change additionally
 * reloads the dayjs locale data (async).
 */
function refreshLocalizationOnChange(serviceManager: ServiceManager) {
  let previousLanguagePack = serviceManager.store.getState().languagePack;
  let previousLocale = serviceManager.store.getState().config.public.locale;

  return () => {
    const state = serviceManager.store.getState();
    const { languagePack } = state;
    const locale = state.config.public.locale;

    // Equal string values need no formatter rebuild, even when their container changes.
    const languageChanged =
      previousLanguagePack !== languagePack &&
      !isEqual(previousLanguagePack, languagePack);
    const localeChanged = previousLocale !== locale;

    previousLanguagePack = languagePack;
    previousLocale = locale;

    if (languageChanged || localeChanged) {
      void refreshLocalization(serviceManager, { localeChanged });
    }
  };
}

export { refreshLocalizationOnChange };

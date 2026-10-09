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
import { toPersistableState } from './persistenceUtils';

/**
 * Persists `persistedToBrowserStorage` whenever it changes. By default this writes to the browser's
 * sessionStorage. When the host owns persistence (`config.persistedState`), the change is reported to
 * its `onStateChange` callback instead — the persisted-slice reference gate below is exactly "the
 * persistable state changed", so the callback is not fired on transient changes such as input text.
 */
function copyToSessionStorage(serviceManager: ServiceManager) {
  let previousPersistedToBrowserStorage =
    serviceManager.store.getState().persistedToBrowserStorage;
  return () => {
    const { persistedToBrowserStorage, config } =
      serviceManager.store.getState();
    const persistChatSession =
      previousPersistedToBrowserStorage !== persistedToBrowserStorage;

    if (persistChatSession) {
      previousPersistedToBrowserStorage = persistedToBrowserStorage;

      const persistedStateConfig = config.public.persistedState;
      if (
        persistedStateConfig?.initialState ||
        persistedStateConfig?.onStateChange
      ) {
        persistedStateConfig.onStateChange?.(
          toPersistableState(persistedToBrowserStorage)
        );
      } else {
        serviceManager.userSessionStorageService.persistSession(
          persistedToBrowserStorage
        );
      }
    }
  };
}

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

    // Some callers can replace the pack with an equivalent object. Avoid the
    // localization work in that case while keeping the reference check cheap.
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

export { copyToSessionStorage, refreshLocalizationOnChange };

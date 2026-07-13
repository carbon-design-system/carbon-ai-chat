/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";

import { createIntl } from "./i18n";
import { loadLocale } from "./languageUtils";
import { LanguagePack } from "../../types/config/PublicConfig";
import { ServiceManager } from "../services/ServiceManager";

/**
 * A simple utility function to set the i18n formatter on the given service manager.
 * This replaces the previous react-intl based implementation.
 */
function setIntl(
  serviceManager: ServiceManager,
  locale: string,
  messages: LanguagePack,
) {
  serviceManager.intl = createIntl({ locale, messages });
}

/**
 * Rebuilds `serviceManager.intl` (and, on a locale change, the dayjs locale)
 * from the current store state. This is the single post-boot owner of the i18n
 * formatter: the language-pack subscription calls it whenever the `languagePack`
 * slice or `config.locale` changes, so no update path can leave the formatter
 * showing stale strings or the wrong locale after a runtime change.
 *
 * The formatter snapshots its messages at creation, so it must be rebuilt — not
 * mutated — when the strings change.
 *
 * When `localeChanged` is true the locale itself changed: this (re)loads the
 * dayjs locale data (async) and adopts the normalized locale name. When false (a
 * strings-only change) the already-resolved locale is reused, keeping the rebuild
 * synchronous.
 */
async function refreshLocalization(
  serviceManager: ServiceManager,
  { localeChanged }: { localeChanged: boolean },
): Promise<void> {
  const state = serviceManager.store.getState();
  const languagePack = state.languagePack;

  if (localeChanged) {
    const locale = state.config.public.locale || "en";
    const localePack = await loadLocale(locale);
    dayjs.locale(localePack);
    setIntl(serviceManager, localePack.name, languagePack);
  } else {
    // Strings-only change: keep the locale the formatter already resolved (the
    // normalized name set at boot / the last locale change), so a strings edit
    // never silently shifts regional formatting.
    const locale =
      serviceManager.intl?.locale || state.config.public.locale || "en";
    setIntl(serviceManager, locale, languagePack);
  }
}

export { setIntl, refreshLocalization };

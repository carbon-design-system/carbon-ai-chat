/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";
import enLocaleData from "dayjs/locale/en.js";
import { consoleError } from "./miscUtils";
import { normalizeModuleInterop } from "./moduleInterop";

const localeLoaders = {
  ar: () =>
    import("dayjs/locale/ar.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-dz": () =>
    import("dayjs/locale/ar-dz.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-kw": () =>
    import("dayjs/locale/ar-kw.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-ly": () =>
    import("dayjs/locale/ar-ly.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-ma": () =>
    import("dayjs/locale/ar-ma.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-sa": () =>
    import("dayjs/locale/ar-sa.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "ar-tn": () =>
    import("dayjs/locale/ar-tn.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  cs: () =>
    import("dayjs/locale/cs.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  de: () =>
    import("dayjs/locale/de.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "de-at": () =>
    import("dayjs/locale/de-at.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "de-ch": () =>
    import("dayjs/locale/de-ch.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  en: () =>
    import("dayjs/locale/en.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-au": () =>
    import("dayjs/locale/en-au.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-ca": () =>
    import("dayjs/locale/en-ca.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-gb": () =>
    import("dayjs/locale/en-gb.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-ie": () =>
    import("dayjs/locale/en-ie.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-il": () =>
    import("dayjs/locale/en-il.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "en-nz": () =>
    import("dayjs/locale/en-nz.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  es: () =>
    import("dayjs/locale/es.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "es-do": () =>
    import("dayjs/locale/es-do.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "es-us": () =>
    import("dayjs/locale/es-us.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  nl: () =>
    import("dayjs/locale/nl.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  fr: () =>
    import("dayjs/locale/fr.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "fr-ca": () =>
    import("dayjs/locale/fr-ca.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "fr-ch": () =>
    import("dayjs/locale/fr-ch.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  it: () =>
    import("dayjs/locale/it.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "it-ch": () =>
    import("dayjs/locale/it-ch.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  ja: () =>
    import("dayjs/locale/ja.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  ko: () =>
    import("dayjs/locale/ko.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  pt: () =>
    import("dayjs/locale/pt.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "pt-br": () =>
    import("dayjs/locale/pt-br.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  zh: () =>
    import("dayjs/locale/zh-cn.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "zh-cn": () =>
    import("dayjs/locale/zh-cn.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "zh-tw": () =>
    import("dayjs/locale/zh-tw.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  // The zh-mo and zh-hk locales fallback to zh-tw.
  "zh-mo": () =>
    import("dayjs/locale/zh-tw.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
  "zh-hk": () =>
    import("dayjs/locale/zh-tw.js" as any).then((mod) =>
      normalizeModuleInterop(mod),
    ),
};

/**
 * Determines if the given object contains a key that supported the given locale. This will determine if there is an
 * exact match from the given object and if so, that key will be returned. If not, the language will be extracted
 * from the locale and that will be checked to see if it supported by the given object. If the language is
 * supported, that will be returned. If nothing is found to support the locale, this will return null.
 *
 * @param locale The locale (which may or may not include a region) to determine if we have a valid match or null if
 * there is no match.
 * @param object The object containing the values to check for support.
 */
function isSupportedLocale<T>(locale: string, object: T): keyof T | null {
  if (!locale) {
    return null;
  }

  // Normalize the locale to lower case and change underscores to dashes.
  locale = locale.toLowerCase().replace(/_/g, "-");

  if ((object as any)[locale]) {
    // If there's an exact match for the requested locale, then we'll use that.
    return locale as keyof T;
  }

  // If not, look to see if there's a match for just the language without the region.
  const language = locale.substring(0, 2);
  if ((object as any)[language]) {
    return language as keyof T;
  }

  // No match was found.
  return null;
}

/**
 * Determines if the given object contains a key that supported the given locale. This will determine if there is an
 * exact match from the given object and if so, that key will be returned. If not, the language will be extracted
 * from the locale and that will be checked to see if it supported by the given object. If the language is
 * supported, that will be returned. If nothing is found to support the locale, this will return null. If no locale
 * was requested, then the browser's languages/locales will be used instead.
 *
 * @param requestedLocale The locale (which may or may not include a region) that was provided in the public config.
 * @param object The object containing the values to check for support.
 * @param objectType A user friendly string describing the type of data in the given object. Used for outputting
 * error messages.
 */
function findSupportedKey<T>(
  requestedLocale: string,
  object: T,
  objectType: string,
): keyof T {
  // Check to see if the requested locale is supported.
  const requestedSupported = isSupportedLocale(requestedLocale, object);
  if (requestedSupported) {
    return requestedSupported;
  }

  if (requestedLocale) {
    const keyList = JSON.stringify(Object.keys(object));
    consoleError(
      `The requested locale "${requestedLocale}" does not contain a supported ${objectType}. We are defaulting to "en". The supported values are ${keyList}.`,
    );
  }

  // Return English as the default.
  return "en" as keyof T;
}

/**
 * Loads the appropriate {@link LanguagePack} from the corresponding module for the requested locale.
 */
async function loadLocale(requestedLocale: string): Promise<ILocale> {
  try {
    const localeKey = findSupportedKey(
      requestedLocale,
      localeLoaders,
      "locale",
    );
    const localeModule = await localeLoaders[localeKey]();
    if (localeModule) {
      return localeModule;
    }
    consoleError(
      `The locale data for "${localeKey}" did not load. The application will default to "en".`,
    );
  } catch (error) {
    consoleError(
      `An error occurred loading the locale data for "${requestedLocale}". The application will default to "en".`,
      error,
    );
  }
  return enLocaleData;
}

/**
 * Loads a dayjs locale if it hasn't been loaded already, but doesn't replace the current globally set locale.
 *
 * @param locale The dayjs locale to load.
 * @returns returns the locale it succeeded to load.
 */
async function loadDayjsLocale(locale: string): Promise<string> {
  if (!dayjs.Ls[locale]) {
    const previousLocale = dayjs.locale();
    const localePack = await loadLocale(locale);

    // We need to temporarily set the new locale globally so that it's available and then return to the previously
    // set locale.
    dayjs.locale(localePack);
    dayjs.locale(previousLocale);

    // Determine if the locale we attempted to set was successful.
    const isLoaded = Boolean(dayjs.Ls[locale]);
    // If the locale we attempted to load was not successful, and it's 2 characters long, it's not a locale
    // recognized by dayjs, and we should throw an error.
    if (!isLoaded && locale.length === 2) {
      throw Error("Locale is not recognized.");
    } else if (!isLoaded) {
      // If the locale we were provided is more than two characters, we were possibly given a region that's not
      // supported, so let's attempt to load just the language, which is the first two characters.
      return loadDayjsLocale(locale.substring(0, 2));
    }
  }
  return locale;
}

export { loadLocale, loadDayjsLocale, localeLoaders };

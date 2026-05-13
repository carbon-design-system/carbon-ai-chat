/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import enLanguagePackData from "../../chat/languages/en.json";

/**
 * The raw strings used for {@link PublicConfig.strings}. Presented in ICU format.
 *
 * @category Config
 */
export const enLanguagePack = enLanguagePackData;

/**
 * A language pack represents the set of display strings for a particular language.
 * It defines all the text strings that can be customized for different languages.
 *
 * @category Config
 */
export type LanguagePack = typeof enLanguagePack;

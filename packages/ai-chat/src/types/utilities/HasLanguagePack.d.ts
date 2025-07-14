/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LanguagePack } from "../LanguagePack";

/**
 * A simple interface for objects that have a reference to the dictionary of all translated language strings for the
 * application.
 */

interface HasLanguagePack {
  // All of the language strings for the application for the currently selected locale.
  languagePack: LanguagePack;
}

export default HasLanguagePack;

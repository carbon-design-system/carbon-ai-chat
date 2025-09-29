/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a React hook that will provided access to the {@link LanguagePack}.
 */

import { useContext } from "react";

import { LanguagePackContext } from "../contexts/LanguagePackContext";

function useLanguagePack() {
  return useContext(LanguagePackContext);
}

export { useLanguagePack };

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * LanguagePackProvider
 *
 * Provides the current LanguagePack to descendants via {@link LanguagePackContext}.
 */

import React, { ReactNode, type JSX } from "react";
import { LanguagePackContext } from "../contexts/LanguagePackContext";
import type { LanguagePack } from "../../types/config/PublicConfig";

interface LanguagePackProviderProps {
  languagePack: LanguagePack;
  children?: ReactNode;
}

function LanguagePackProvider({
  languagePack,
  children,
}: LanguagePackProviderProps): JSX.Element {
  return (
    <LanguagePackContext.Provider value={languagePack}>
      {children}
    </LanguagePackContext.Provider>
  );
}

export { LanguagePackProvider };

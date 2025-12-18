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
import { useSelector } from "../hooks/useSelector";
import { LanguagePackContext } from "../contexts/LanguagePackContext";
import { AppState } from "../../types/state/AppState";

interface LanguagePackProviderProps {
  children?: ReactNode;
}

function LanguagePackProvider({
  children,
}: LanguagePackProviderProps): JSX.Element {
  const languagePack = useSelector(
    (state: AppState) => state.config.derived.languagePack,
  );

  return (
    <LanguagePackContext.Provider value={languagePack}>
      {children}
    </LanguagePackContext.Provider>
  );
}

export { LanguagePackProvider };

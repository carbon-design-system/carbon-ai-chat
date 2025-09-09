/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { LanguagePack } from "../../types/config/PublicConfig";

/**
 * This file contains the instance of the {@link LanguagePackContext} which is used to provide access to the
 * {@link LanguagePack}.
 */

const LanguagePackContext = React.createContext<LanguagePack>(null);

export { LanguagePackContext };

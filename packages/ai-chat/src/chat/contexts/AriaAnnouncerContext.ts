/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import type { AriaAnnouncerFunctionType } from "../utils/viewHandles.js";

/**
 * This file contains the instance of the {@link AriaAnnouncerContext} which is used to provide access to the
 * {@link AriaAnnouncerProvider}. `AriaAnnouncerFunctionType` is declared in the framework-neutral
 * `utils/viewHandles.ts` and re-exported here so existing importers are unaffected.
 */

const AriaAnnouncerContext =
  React.createContext<AriaAnnouncerFunctionType>(null);

export { AriaAnnouncerContext };
export type { AriaAnnouncerFunctionType };

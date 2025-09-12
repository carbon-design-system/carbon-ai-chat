/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { AnnounceMessage } from "../../types/state/AppState";

/**
 * This file contains the instance of the {@link AriaAnnouncerContext} which is used to provide access to the
 * {@link AriaAnnouncerProvider}.
 */

/**
 * This is the function that will be used to trigger an announcement of a given value.
 *
 * @see AriaAnnouncerProvider
 */
type AriaAnnouncerFunctionType = (
  value: Node | AnnounceMessage | string,
) => void;

const AriaAnnouncerContext =
  React.createContext<AriaAnnouncerFunctionType>(null);

export { AriaAnnouncerContext, AriaAnnouncerFunctionType };

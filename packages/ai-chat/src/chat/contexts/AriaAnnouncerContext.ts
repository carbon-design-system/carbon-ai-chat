/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import type { AriaAnnouncerFunctionType } from '../services/ariaAnnouncer';

const AriaAnnouncerContext =
  React.createContext<AriaAnnouncerFunctionType>(null);

export { AriaAnnouncerContext };
export type { AriaAnnouncerFunctionType };

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import { CDSLoading as CarbonLoadingElement } from '@carbon/web-components/es/components/loading/index.js';

const Loading = createComponent({
  tagName: 'cds-loading',
  elementClass: CarbonLoadingElement,
  react: React,
});

export default Loading;

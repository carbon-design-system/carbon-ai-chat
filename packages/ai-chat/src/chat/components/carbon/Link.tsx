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

import { CDSLink as CarbonLinkElement } from '@carbon/web-components/es/components/link/index.js';

const Link = createComponent({
  tagName: 'cds-link',
  elementClass: CarbonLinkElement,
  react: React,
});

export default Link;

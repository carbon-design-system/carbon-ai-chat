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
import { CDSClickableTile as CarbonClickableTileElement } from '@carbon/web-components/es/components/tile/index.js';

const ClickableTile = createComponent({
  tagName: 'cds-clickable-tile',
  elementClass: CarbonClickableTileElement,
  react: React,
});

export default ClickableTile;

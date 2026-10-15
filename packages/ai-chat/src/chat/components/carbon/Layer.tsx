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

import { CDSLayer as CarbonLayerElement } from '@carbon/web-components/es/components/layer/index.js';

const Layer = createComponent({
  tagName: 'cds-layer',
  elementClass: CarbonLayerElement,
  react: React,
});

export default Layer;

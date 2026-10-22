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
export {
  BUTTON_KIND,
  BUTTON_TYPE,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
} from '@carbon/web-components/es/components/button/defs.js';
import { CDSButton as CarbonButtonElement } from '@carbon/web-components/es/components/button/index.js';

const Button = createComponent({
  tagName: 'cds-button',
  elementClass: CarbonButtonElement,
  react: React,
});

export default Button;

/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CDSAILabelActionButton } from '@carbon/web-components/es/components/ai-label/index.js';

import { createComponent } from '@lit/react';
import React from 'react';

const AILabelActionButton = createComponent({
  tagName: 'cds-ai-label-action-button',
  elementClass: CDSAILabelActionButton,
  react: React,
});

export default AILabelActionButton;

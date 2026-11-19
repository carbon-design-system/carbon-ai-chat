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

import { CDSAIChatProcessing } from '../components/aichat-processing/index.js';

const Processing = createComponent({
  tagName: CDSAIChatProcessing.is,
  elementClass: CDSAIChatProcessing,
  react: React,
});

export default Processing;

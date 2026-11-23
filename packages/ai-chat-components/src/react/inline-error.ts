/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';
import prefix from '../globals/settings.js';
import CDSAIChatInlineError from '../components/inline-error/src/inline-error.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const InlineError = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-inline-error`,
    elementClass: CDSAIChatInlineError,
    react: React,
  })
);

export default InlineError;

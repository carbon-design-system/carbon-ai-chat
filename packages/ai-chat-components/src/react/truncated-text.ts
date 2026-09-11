/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';

import CDSAIChatTruncatedText from '../components/truncated-text/src/truncated-text.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge';

const TruncatedText = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-truncated-text',
    elementClass: CDSAIChatTruncatedText,
    react: React,
  })
);

export { TruncatedText };
export default TruncatedText;

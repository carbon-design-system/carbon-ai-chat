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

import { CDSAIChatToolCallData } from '../components/aichat-chain-of-thought/index.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const ToolCallData = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatToolCallData.is,
    elementClass: CDSAIChatToolCallData,
    react: React,
  })
);

export default ToolCallData;

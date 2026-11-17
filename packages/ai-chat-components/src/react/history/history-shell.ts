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
import { CDSAIChatHistoryShell } from '../../components/aichat-history/index.js';
import { withWebComponentBridge } from '../utils/withWebComponentBridge.js';

const HistoryShell = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatHistoryShell.is,
    elementClass: CDSAIChatHistoryShell,
    react: React,
  })
);

export default HistoryShell;

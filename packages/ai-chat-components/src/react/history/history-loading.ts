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
import { CDSAIChatHistoryLoading } from '../../components/aichat-history/index.js';

const HistoryLoading = createComponent({
  tagName: CDSAIChatHistoryLoading.is,
  elementClass: CDSAIChatHistoryLoading,
  react: React,
});

export default HistoryLoading;

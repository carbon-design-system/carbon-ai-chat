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
import { CDSAIChatHistoryPanelItems } from '../../components/aichat-history/index.js';

const HistoryPanelItems = createComponent({
  tagName: CDSAIChatHistoryPanelItems.is,
  elementClass: CDSAIChatHistoryPanelItems,
  react: React,
});

export default HistoryPanelItems;

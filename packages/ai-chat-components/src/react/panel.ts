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
import { CDSAIChatPanel as CdsChatPanelElement } from '../components/aichat-shell/index.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const CDSAIChatPanel = withWebComponentBridge(
  createComponent({
    tagName: CdsChatPanelElement.is,
    elementClass: CdsChatPanelElement,
    react: React,
    events: {
      onOpenStart: 'openstart',
      onOpenEnd: 'openend',
      onCloseStart: 'closestart',
      onCloseEnd: 'closeend',
      onBodyScroll: 'body-scroll',
    },
  })
);

export default CDSAIChatPanel;

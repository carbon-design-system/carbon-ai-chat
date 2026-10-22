/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { CDSAIChatPanel as CdsChatPanelElement } from '../components/aichat-shell/index.js';
import type {
  PanelBodyScrollEventDetail,
  PanelOpenEndEventDetail,
} from '../components/aichat-shell/index.js';

const CDSAIChatPanel = createComponent({
  tagName: CdsChatPanelElement.is,
  elementClass: CdsChatPanelElement,
  react: React,
  events: {
    onOpenStart: 'openstart' as EventName<CustomEvent<null>>,
    onOpenEnd: 'openend' as EventName<CustomEvent<PanelOpenEndEventDetail>>,
    onCloseStart: 'closestart' as EventName<CustomEvent<null>>,
    onCloseEnd: 'closeend' as EventName<CustomEvent<null>>,
    onBodyScroll: 'body-scroll' as EventName<
      CustomEvent<PanelBodyScrollEventDetail>
    >,
  },
});

export default CDSAIChatPanel;

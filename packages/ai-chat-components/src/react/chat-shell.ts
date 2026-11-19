/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { CDSAIChatShell as CDSChatShellElement } from '../components/aichat-shell/index.js';

const CDSAIChatShell = createComponent({
  tagName: CDSChatShellElement.is,
  elementClass: CDSChatShellElement,
  react: React,
  events: {
    onPanelFocusFallback: 'cds-aichat-shell-panel-focus-fallback' as EventName<
      CustomEvent<null>
    >,
  },
});

export default CDSAIChatShell;

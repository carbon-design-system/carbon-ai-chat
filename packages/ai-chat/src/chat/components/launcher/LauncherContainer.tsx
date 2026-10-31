/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createComponent } from '@lit/react';
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import LauncherView from './launcher';

const nativeLauncherEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeLauncher = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-launcher-view',
    elementClass: LauncherView,
    react: React,
    events: nativeLauncherEvents,
  }),
  { events: nativeLauncherEvents }
);

const LauncherContainer = React.memo(NativeLauncher);

export { LauncherContainer };

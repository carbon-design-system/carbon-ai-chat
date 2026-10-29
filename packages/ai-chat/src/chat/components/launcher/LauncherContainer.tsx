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
import LauncherView from './launcher';

const NativeLauncher = createComponent({
  tagName: 'cds-aichat-launcher-view',
  elementClass: LauncherView,
  react: React,
});

const LauncherContainer = React.memo(NativeLauncher);

export { LauncherContainer };

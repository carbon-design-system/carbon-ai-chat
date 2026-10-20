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

import { CDSAIChatLauncher } from '../components/aichat-launcher/index.js';

const Launcher = createComponent({
  tagName: CDSAIChatLauncher.is,
  elementClass: CDSAIChatLauncher,
  react: React,
  events: {
    onToggle: 'cds-aichat-launcher-toggle' as EventName<CustomEvent<null>>,
  },
});

export default Launcher;

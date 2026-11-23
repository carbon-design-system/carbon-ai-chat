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
import prefix from '../globals/settings.js';
import CDSAIChatSystemMessage from '../components/system-message/src/system-message.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const SystemMessage = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-system-message`,
    elementClass: CDSAIChatSystemMessage,
    react: React,
  })
);

export default SystemMessage;

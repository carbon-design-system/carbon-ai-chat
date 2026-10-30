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
import CDSAIChatUserAvatar from '../components/user-avatar/src/user-avatar.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const UserAvatar = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-user-avatar`,
    elementClass: CDSAIChatUserAvatar,
    react: React,
  })
);

export default UserAvatar;

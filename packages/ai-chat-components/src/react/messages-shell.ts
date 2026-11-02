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
import prefix from '../globals/settings.js';
import CDSAIChatMessagesShell, {
  type MessagesShellScrollDetail,
} from '../components/messages-shell/src/messages-shell.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const MessagesShell = withWebComponentBridge(
  createComponent({
    tagName: `${prefix}-messages-shell`,
    elementClass: CDSAIChatMessagesShell,
    react: React,
    events: {
      onMessagesShellScroll: CDSAIChatMessagesShell.eventScroll as EventName<
        CustomEvent<MessagesShellScrollDetail>
      >,
    },
  })
);

export default MessagesShell;

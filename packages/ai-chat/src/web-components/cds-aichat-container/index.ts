/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is the exposed web component for a basic floating chat.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ChatAppEntry } from '../../chat/ChatAppEntry';
import { installDefaultRenderer } from '../shared/react-renderer';

/**
 * The renderer for plain web-component hosts: one React root per mount.
 *
 * It lives in this entry, and the class it renders lives next door, because
 * only this file may reach `react-dom/client` — React 17 does not ship that
 * module, and the React components import the class directly.
 */
installDefaultRenderer({
  mount(target) {
    const root = createRoot(target);
    return {
      render(inputs) {
        root.render(React.createElement(ChatAppEntry, inputs));
      },
      unmount() {
        root.unmount();
      },
    };
  },
});

export { default } from './cds-aichat-container';
export type { CdsAiChatContainerAttributes } from './cds-aichat-container';

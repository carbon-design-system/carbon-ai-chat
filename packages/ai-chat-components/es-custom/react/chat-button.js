/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import AIChatButton from '../components/chat-button/src/chat-button.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';
export { CHAT_BUTTON_SIZE } from '../components/chat-button/defs.js';
export { BUTTON_KIND as CHAT_BUTTON_KIND, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_ALIGNMENT, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_POSITION, BUTTON_TYPE as CHAT_BUTTON_TYPE } from '@carbon/web-components/es-custom/components/button/button.js';

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
const ChatButton = withWebComponentBridge(createComponent({
    tagName: "cds-aichat-button",
    elementClass: AIChatButton,
    react: React,
}));

export { ChatButton as default };
//# sourceMappingURL=chat-button.js.map

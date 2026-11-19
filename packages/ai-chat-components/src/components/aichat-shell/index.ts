/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-toolbar/index.js';
import CDSAIChatPanel from './aichat-panel.js';
import CDSAIChatShell from './aichat-shell.js';
import CdsAiChatChatHeader from './aichat-chat-header.js';

export { default as CdsAiChatChatHeader } from './aichat-chat-header.js';

export { CDSAIChatPanel, CDSAIChatShell };

defineCustomElement(CDSAIChatPanel);
defineCustomElement(CDSAIChatShell);
defineCustomElement(CdsAiChatChatHeader);

export type { PanelOpenEndEventDetail } from './aichat-panel.js';

export type { PanelBodyScrollEventDetail } from './aichat-panel.js';

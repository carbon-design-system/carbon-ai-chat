/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '@carbon/ai-chat-components/es/globals/register.js';
import ChatCustomElement from './cds-aichat-custom-element';
import { installReactDomRenderer } from '../shared/react-dom-renderer';
import '../cds-aichat-container';

export { default as __cds_aichat_container_register } from '../cds-aichat-container';

installReactDomRenderer();

defineCustomElement(ChatCustomElement);

// The host class stays a default export so `ChatCustomElement` keeps naming the
// root React type below; import the pure class entry for a named class.
export default ChatCustomElement;
export type { CdsAiChatCustomElementAttributes } from './types';
// Before these paths had their own declarations they resolved to the root ones.
// Keep those names so existing type imports through them still compile.
export type * from '../../aiChatEntry';

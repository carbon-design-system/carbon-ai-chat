/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { installReactDomRenderer } from '../shared/react-dom-renderer';

installReactDomRenderer();

export { default, ChatContainer } from './register';
export type { CdsAiChatContainerAttributes } from './cds-aichat-container';

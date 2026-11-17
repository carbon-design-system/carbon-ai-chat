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

// The host class stays a default export so `ChatContainer` keeps naming the
// root React type below; import the pure class entry for a named class.
export { default } from './register';
export type { CdsAiChatContainerAttributes } from './cds-aichat-container';
// Before these paths had their own declarations they resolved to the root ones.
// Keep those names so existing type imports through them still compile.
export type * from '../../aiChatEntry';

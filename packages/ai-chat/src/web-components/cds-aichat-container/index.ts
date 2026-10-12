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

import { installReactDomRenderer } from '../shared/react-dom-renderer';

installReactDomRenderer();

export { default } from './cds-aichat-container';
export type { CdsAiChatContainerAttributes } from './cds-aichat-container';

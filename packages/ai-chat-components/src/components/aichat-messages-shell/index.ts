/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatMessagesShell from './aichat-messages-shell.js';

export { CDSAIChatMessagesShell };
export type { MessagesShellScrollDetail } from './aichat-messages-shell.js';
export { MessagesScrollController } from './messages-scroll-controller.js';
export type {
  PortableMessage,
  ScrollOptions,
  ScrollHost,
} from './messages-scroll-controller.js';

defineCustomElement(CDSAIChatMessagesShell);

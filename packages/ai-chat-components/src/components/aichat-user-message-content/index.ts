/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../aichat-markdown/index.js';
import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatUserMessageContent from './aichat-user-message-content.js';

export { CDSAIChatUserMessageContent };

defineCustomElement(CDSAIChatUserMessageContent);

/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatButton from './aichat-button.js';
import CDSAIChatButtonSkeleton from './aichat-button-skeleton.js';

export { CDSAIChatButton, CDSAIChatButtonSkeleton };

defineCustomElement(CDSAIChatButton);
defineCustomElement(CDSAIChatButtonSkeleton);

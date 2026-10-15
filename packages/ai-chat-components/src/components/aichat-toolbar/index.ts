/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-truncated-text/index.js';
import CDSAIChatToolbar from './aichat-toolbar.js';

export { CDSAIChatToolbar };

defineCustomElement(CDSAIChatToolbar);

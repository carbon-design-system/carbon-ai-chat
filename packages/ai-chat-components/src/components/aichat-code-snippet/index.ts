/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-toolbar/index.js';
import CDSAIChatCodeSnippet from './aichat-code-snippet.js';

export { default } from './aichat-code-snippet.js';
export type { Action } from './aichat-code-snippet.js';
export { CODE_SNIPPET_TYPE } from '@carbon/web-components/es/components/code-snippet/defs.js';

export { CDSAIChatCodeSnippet };

defineCustomElement(CDSAIChatCodeSnippet);

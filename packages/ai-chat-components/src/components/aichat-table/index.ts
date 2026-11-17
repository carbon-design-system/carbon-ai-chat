/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import CDSAIChatTable from './aichat-table.js';

export { default } from './aichat-table.js';
export type { TableItemCell, TableItemRow } from './types.js';

export { CDSAIChatTable };

defineCustomElement(CDSAIChatTable);

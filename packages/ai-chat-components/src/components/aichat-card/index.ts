/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import CardSteps from './aichat-card-steps.js';
import Card from './aichat-card.js';
import CardFooter from './aichat-card-footer.js';

export { CardSteps, Card, CardFooter };

defineCustomElement(CardSteps);
defineCustomElement(Card);
defineCustomElement(CardFooter);

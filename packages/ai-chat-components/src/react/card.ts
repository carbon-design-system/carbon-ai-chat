/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import {
  Card as CDSAIChatCard,
  CardFooter as CDSAIChatCardFooter,
  CardSteps as CDSAIChatCardSteps,
} from '../components/aichat-card/index.js';

import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const Card = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatCard.is,
    elementClass: CDSAIChatCard,
    react: React,
  })
);

const CardFooter = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatCardFooter.is,
    elementClass: CDSAIChatCardFooter,
    react: React,
    events: {
      onFooterAction: 'cds-aichat-card-footer-action',
    },
  })
);

const CardSteps = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatCardSteps.is,
    elementClass: CDSAIChatCardSteps,
    react: React,
  })
);

export { Card, CardFooter, CardSteps };
export default Card;

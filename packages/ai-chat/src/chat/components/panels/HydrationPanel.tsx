/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createComponent } from '@lit/react';
import HydrationBody from './native/HydrationBody';

interface HydrationPanelProps {
  isHydrated: boolean;
}

const NativeHydrationBody = createComponent({
  tagName: 'cds-aichat-hydration-body',
  elementClass: HydrationBody,
  react: React,
});

const HydrationPanel = ({ isHydrated }: HydrationPanelProps) => (
  <NativeHydrationBody isHydrated={isHydrated} />
);

export default HydrationPanel;

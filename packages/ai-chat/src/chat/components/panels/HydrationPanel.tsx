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
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import HydrationBody from './native/HydrationBody';

interface HydrationPanelProps {
  isHydrated: boolean;
}

const nativeHydrationBodyEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeHydrationBody = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-hydration-body',
    elementClass: HydrationBody,
    react: React,
    events: nativeHydrationBodyEvents,
  }),
  { events: nativeHydrationBodyEvents }
);

const HydrationPanel = ({ isHydrated }: HydrationPanelProps) => (
  <NativeHydrationBody isHydrated={isHydrated} />
);

export default HydrationPanel;

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
import HomeScreenView, { type HomeScreenProps } from './home-screen';

const events = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeHomeScreen = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-home-screen',
    elementClass: HomeScreenView,
    react: React,
    events,
  }),
  { events }
);

function HomeScreenComponent(props: HomeScreenProps) {
  return <NativeHomeScreen {...props} />;
}

const HomeScreen = React.memo(HomeScreenComponent);

export { HomeScreen };

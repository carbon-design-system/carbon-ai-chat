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
import HomeScreenView, { type HomeScreenProps } from './home-screen';

const NativeHomeScreen = createComponent({
  tagName: 'cds-aichat-home-screen',
  elementClass: HomeScreenView,
  react: React,
});

function HomeScreenComponent(props: HomeScreenProps) {
  return <NativeHomeScreen {...props} />;
}

const HomeScreen = React.memo(HomeScreenComponent);

export { HomeScreen };

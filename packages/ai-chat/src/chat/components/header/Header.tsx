/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { createComponent } from '@lit/react';
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import type { HasRequestFocus } from '../../../types/utilities/HasRequestFocus';
import type { HeaderProps } from '../../utils/headerView';
import HeaderView from './chat-header';

const nativeHeaderEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeHeader = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-header-view',
    elementClass: HeaderView,
    react: React,
    events: nativeHeaderEvents,
  }),
  { events: nativeHeaderEvents }
);

const Header = React.memo(
  forwardRef<HasRequestFocus, HeaderProps>(
    function HeaderComponent(props, ref) {
      const nativeRef = useRef<HeaderView>(null);
      useImperativeHandle(
        ref,
        () => ({
          requestFocus: () => nativeRef.current?.requestFocus() ?? false,
        }),
        []
      );
      return (
        <NativeHeader
          {...props}
          ref={nativeRef}
          transformIcon={transformReactIconToCarbonIcon}
        />
      );
    }
  )
);

export { Header };

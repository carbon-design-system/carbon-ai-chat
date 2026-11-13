/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createComponent } from '@lit/react';
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import type { ToolbarAction } from '../../../types/config/HeaderConfig';
import InputActions from './native/InputActions';

const nativeInputActionsEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeInputActions = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-input-actions',
    elementClass: InputActions,
    react: React,
    events: nativeInputActionsEvents,
  }),
  { events: nativeInputActionsEvents }
);

interface InputActionsMenuProps {
  disabled: boolean;
  actions: ToolbarAction[];
  menuLabel: string;
}

function InputActionsMenu(props: InputActionsMenuProps) {
  return (
    <NativeInputActions
      {...props}
      transformIcon={transformReactIconToCarbonIcon}
    />
  );
}

export { InputActionsMenu };

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
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import type { ToolbarAction } from '../../../types/config/HeaderConfig';
import InputActions from './native/InputActions';

const NativeInputActions = createComponent({
  tagName: 'cds-aichat-input-actions',
  elementClass: InputActions,
  react: React,
});

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

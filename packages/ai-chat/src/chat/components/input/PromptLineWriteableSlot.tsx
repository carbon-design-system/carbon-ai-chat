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
import type { WriteableElementName } from '../../../types/instance/WriteableElements';
import PromptLineSlot from './native/PromptLineSlot';

const nativePromptLineSlotEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativePromptLineSlot = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-prompt-line-slot',
    elementClass: PromptLineSlot,
    react: React,
    events: nativePromptLineSlotEvents,
  }),
  { events: nativePromptLineSlotEvents }
);

interface PromptLineWriteableSlotProps {
  slotName: WriteableElementName;
  wrapperSlot: string;
}

function PromptLineWriteableSlot(props: PromptLineWriteableSlotProps) {
  return <NativePromptLineSlot {...props} />;
}

export default React.memo(PromptLineWriteableSlot);

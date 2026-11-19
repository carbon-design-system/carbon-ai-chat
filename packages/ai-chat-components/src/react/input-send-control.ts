/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';
import { InputSendControlElement } from '../components/aichat-prompt-line/index.js';

const CDSAIChatInputSendControl = createComponent({
  tagName: InputSendControlElement.is,
  elementClass: InputSendControlElement,
  react: React,
  events: {
    onSend: 'cds-aichat-input-send' as EventName<CustomEvent<null>>,
    onStopStreaming: 'cds-aichat-input-stop-streaming' as EventName<
      CustomEvent<null>
    >,
  },
});

export default CDSAIChatInputSendControl;

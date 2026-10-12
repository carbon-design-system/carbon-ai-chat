/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  MessageResponseTypes,
  OptionItemPreference,
  SelectionDisplay,
} from '@carbon/ai-chat';

import { RESPONSE_MAP } from './responseMap';

function doOption(instance: ChatInstance) {
  const options = Object.keys(RESPONSE_MAP).map((key) => ({
    label: key,
    value: { input: { text: key } },
  }));
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.OPTION,
          title: 'Select a response to view it in action (dropdown).',
          options,
        },
        {
          response_type: MessageResponseTypes.OPTION,
          title: 'Select a response to view it in action (button).',
          description:
            'If under 5 items, default is buttons. If over, moves to dropdown.',
          options,
          preference: OptionItemPreference.BUTTON,
        },
        {
          response_type: MessageResponseTypes.OPTION,
          title: 'Verify choice transcript display and silent selection.',
          description:
            'The control text stays label-first while each option controls the generated user message.',
          preference: OptionItemPreference.BUTTON,
          options: [
            {
              label: 'Default label mode',
              value: { input: { text: 'text' } },
            },
            {
              label: 'Input-text mode',
              value: { input: { text: 'button' } },
              selection_display: SelectionDisplay.INPUT_TEXT,
            },
            {
              label: 'Silent option',
              value: { input: { text: 'card' } },
              silent: true,
            },
            {
              label: '',
              value: { input: { text: 'image' } },
            },
            {
              label: 'Missing input text',
              value: { input: {} },
              selection_display: SelectionDisplay.INPUT_TEXT,
            },
          ],
        },
      ],
    },
  });
}

export { doOption };

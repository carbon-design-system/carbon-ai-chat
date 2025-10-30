/*
 *  Copyright IBM Corp. 2025
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
} from "@carbon/ai-chat";

import { RESPONSE_MAP } from "./responseMap";

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
          title: "Select a response to view it in action (dropdown).",
          options,
        },
        {
          response_type: MessageResponseTypes.OPTION,
          title: "Select a response to view it in action (button).",
          description:
            "If under 5 items, default is buttons. If over, moves to dropdown.",
          options,
          preference: OptionItemPreference.DROPDOWN,
        },
      ],
    },
  });
}

export { doOption };

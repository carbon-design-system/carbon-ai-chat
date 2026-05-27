/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the markdown-override example. Every reply contains two
 * fenced code blocks side-by-side so the effect of overriding the markdown
 * component's default `detectLanguage` flag is visible at a glance:
 *
 *   1. A fence tagged ` ```python ` — the header shows "Python" as usual
 *      because the explicit `language` always renders its label.
 *   2. An untagged fence — with `detectLanguage` set to `false`, the
 *      snippet header omits the detected language label and shows only
 *      the line count.
 */

import {
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const REPLY = `This example overrides the default fenced-code renderer with a \`cds-aichat-code-snippet\` whose new \`detectLanguage\` flag is explicitly set to \`false\` — overriding the markdown component's default of \`true\`.

First, a fence with an explicit language hint — the header shows "Python" as usual and the code is highlighted:

\`\`\`python
def greet(name):
    print(f"Hello, {name}!")

greet("World")
\`\`\`

Now the same code, fenced without a language. With \`detectLanguage\` set to \`false\`, the snippet header omits the detected label and shows only the line count:

\`\`\`
def greet(name):
    print(f"Hello, {name}!")

greet("World")
\`\`\`
`;

async function customSendMessage(
  _request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: REPLY,
        },
      ],
    },
  });
}

export { customSendMessage };

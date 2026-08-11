/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the markdown-plugin example. Every reply contains both
 * inline math (`$E = mc^2$`) and block math (`$$\\int_0^\\infty ... $$`),
 * so opening the example immediately shows that the registered
 * `markdown-it-katex` plugin is rendering the new token types. The chat
 * mounts the plugin's HTML output into a light-DOM slot, where the
 * KaTeX stylesheet loaded by `index.html` styles it normally.
 *
 * Each turn answers with two messages on purpose. Those light-DOM slot hosts
 * live in one shared page-level container and are projected back into each
 * message by slot name, so a single-message example can't show that two
 * messages containing the same math each keep their own rendered output.
 */

import {
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
  MessageResponseTypes,
} from '@carbon/ai-chat';

const KATEX_REPLY = `Plugins can introduce new token types. This example registers [\`@vscode/markdown-it-katex\`](https://www.npmjs.com/package/@vscode/markdown-it-katex) so the renderer understands LaTeX math.

Inline math like $E = mc^2$ flows inside a paragraph. Block math sits on its own line:

$$\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}$$

Plugin output is mounted into a light-DOM slot so the KaTeX stylesheet loaded by \`index.html\` styles it normally.`;

const FOLLOW_UP_REPLY = `Every message renders its own plugin output. This second reply repeats both forms — inline $a^2 + b^2 = c^2$ and block:

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$`;

async function customSendMessage(
  _request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance
) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: KATEX_REPLY,
        },
      ],
    },
  });
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: FOLLOW_UP_REPLY,
        },
      ],
    },
  });
}

export { customSendMessage };

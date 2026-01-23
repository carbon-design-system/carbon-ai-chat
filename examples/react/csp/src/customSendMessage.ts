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
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const WELCOME_TEXT = `Welcome to the CSP example! This demonstrates @carbon/ai-chat working with a strict Content Security Policy (no 'unsafe-inline', no 'unsafe-eval').

Try typing any message to see a response with a code block that triggers lazy loading of CodeMirror.`;

const CODE_EXAMPLE = `
Here's a Python example that demonstrates lazy loading:

\`\`\`python
def greet(name):
    """A simple greeting function."""
    return f"Hello, {name}! This code block tests CSP compliance."

# Test the function
message = greet("World")
print(message)
\`\`\`

The code block above should render with syntax highlighting via CodeMirror, which is lazy-loaded.
`;

/**
 * Simple mock function that returns a text response with code blocks.
 * In a real application, this would call your backend API.
 */
async function customSendMessage(
  request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  if (request.input.text === "") {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: WELCOME_TEXT,
          },
        ],
      },
    });
  } else {
    instance.messaging.addMessage({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: `You said: "${request.input.text}"\n\n${CODE_EXAMPLE}`,
          },
        ],
      },
    });
  }
}

export { customSendMessage };

// Made with Bob

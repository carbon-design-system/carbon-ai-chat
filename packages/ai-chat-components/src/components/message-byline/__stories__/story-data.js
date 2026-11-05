/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Sample reasoning steps for the byline stories. The byline hosts the toggle;
 * the host renders these steps in the panel the toggle controls.
 */
export const reasoningSteps = [
  {
    title: 'Understand the request',
    open: true,
    body: 'Parsed the intent and restated it as a concise objective.',
  },
  {
    title: 'Review retrieved context',
    body: 'Checked the documents and conversation history for relevant facts.',
  },
  {
    title: 'Draft an answer',
    body: 'Combined the prompt with trusted context into a structured reply.',
  },
];

/**
 * Sample chain of thought steps in the same shape the chat receives in
 * `message_options.chain_of_thought`.
 */
export const chainOfThoughtSteps = [
  {
    title: 'Search documentation',
    description:
      'Searching the product documentation for relevant information.',
    tool_name: 'documentation_search',
    request: {
      args: '```\n{\n  "query": "API authentication methods"\n}\n```',
    },
    response: {
      content:
        '```\n{\n  "results": ["OAuth 2.0", "API keys"],\n  "count": 2\n}\n```',
    },
    status: 'success',
  },
  {
    title: 'Generate response',
    description: 'Synthesizing the information into a final answer.',
    tool_name: 'response_generator',
    request: {
      args: '```\n{\n  "context": "authentication",\n  "format": "markdown"\n}\n```',
    },
    response: {
      content: '```\n{\n  "summary": "You are using OAuth 2.0."\n}\n```',
    },
    status: 'success',
  },
];

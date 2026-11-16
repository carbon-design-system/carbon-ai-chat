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

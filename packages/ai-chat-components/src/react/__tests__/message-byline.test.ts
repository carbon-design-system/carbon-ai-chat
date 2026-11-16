/**
 * @jest-environment-options {"customExportConditions": ["browser"]}
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["jest-environment-options"] }] */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import MessageByline from '@carbon/ai-chat-components/es/react/message-byline.js';
import CDSAIChatMessageByline from '@carbon/ai-chat-components/es/components/message-byline/src/message-byline.js';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test('forwards label and timestamp to the element', async () => {
  await act(async () =>
    root.render(
      React.createElement(MessageByline, {
        label: 'Assistant',
        timestamp: '10:42 AM',
      })
    )
  );
  const element = container.querySelector(
    'cds-aichat-message-byline'
  ) as CDSAIChatMessageByline;
  await element.updateComplete;

  expect(element.label).toBe('Assistant');
  expect(element.timestamp).toBe('10:42 AM');
});

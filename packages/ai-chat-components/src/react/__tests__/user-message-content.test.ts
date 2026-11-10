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
import UserMessageContent from '@carbon/ai-chat-components/es/react/user-message-content.js';
import CDSAIChatUserMessageContent from '@carbon/ai-chat-components/es/components/user-message-content/src/user-message-content.js';

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

test('forwards content and slot prefix to the element', async () => {
  const content = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
  };
  await act(async () =>
    root.render(
      React.createElement(UserMessageContent, {
        content,
        slotPrefix: 'msg-1',
      })
    )
  );
  const element = container.querySelector(
    'cds-aichat-user-message-content'
  ) as CDSAIChatUserMessageContent;
  await element.updateComplete;

  expect(element.content).toBe(content);
  expect(element.slotPrefix).toBe('msg-1');
});

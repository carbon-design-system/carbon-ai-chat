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
import SystemMessage from '@carbon/ai-chat-components/es/react/system-message.js';
import CDSAIChatSystemMessage from '@carbon/ai-chat-components/es/components/system-message/src/system-message.js';

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

test('forwards divider and responseStopped to the element', async () => {
  await act(async () =>
    root.render(
      React.createElement(
        SystemMessage,
        { divider: true, responseStopped: true },
        'Response stopped'
      )
    )
  );
  const element = container.querySelector(
    'cds-aichat-system-message'
  ) as CDSAIChatSystemMessage;
  await element.updateComplete;

  expect(element.divider).toBe(true);
  expect(element.responseStopped).toBe(true);
  expect(element.textContent).toBe('Response stopped');
});

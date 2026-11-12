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
import MessageItemShell from '@carbon/ai-chat-components/es/react/message-item-shell.js';
import CDSAIChatMessageItemShell from '@carbon/ai-chat-components/es/components/message-item-shell/src/message-item-shell.js';

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

test('forwards rowType, fullWidth, and hideAvatar to the element', async () => {
  await act(async () =>
    root.render(
      React.createElement(MessageItemShell, {
        rowType: 'request',
        fullWidth: true,
        hideAvatar: true,
      })
    )
  );
  const element = container.querySelector(
    'cds-aichat-message-item-shell'
  ) as CDSAIChatMessageItemShell;
  await element.updateComplete;

  expect(element.rowType).toBe('request');
  expect(element.fullWidth).toBe(true);
  expect(element.hideAvatar).toBe(true);
  expect(element.getAttribute('row-type')).toBe('request');
  expect(element.hasAttribute('full-width')).toBe(true);
  expect(element.hasAttribute('hide-avatar')).toBe(true);
});

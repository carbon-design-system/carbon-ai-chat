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
import UserAvatar from '@carbon/ai-chat-components/es/react/user-avatar.js';
import CDSAIChatUserAvatar from '@carbon/ai-chat-components/es/components/user-avatar/src/user-avatar.js';

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

test('forwards name, image, label, width, and height to the element', async () => {
  await act(async () =>
    root.render(
      React.createElement(UserAvatar, {
        name: 'Alice',
        image: 'https://example.com/alice.png',
        label: 'Agent avatar',
        width: '48px',
        height: '48px',
      })
    )
  );
  const element = container.querySelector(
    'cds-aichat-user-avatar'
  ) as CDSAIChatUserAvatar;
  await element.updateComplete;

  expect(element.name).toBe('Alice');
  expect(element.image).toBe('https://example.com/alice.png');
  expect(element.label).toBe('Agent avatar');
  expect(element.width).toBe('48px');
  expect(element.height).toBe('48px');
});

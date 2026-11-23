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
import InlineError from '@carbon/ai-chat-components/es/react/inline-error.js';
import CDSAIChatInlineError from '@carbon/ai-chat-components/es/components/inline-error/src/inline-error.js';

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

test('forwards iconLabel to the element', async () => {
  await act(async () =>
    root.render(
      React.createElement(InlineError, { iconLabel: 'Error' }, 'Broken')
    )
  );
  const element = container.querySelector(
    'cds-aichat-inline-error'
  ) as CDSAIChatInlineError;
  await element.updateComplete;

  expect(element.iconLabel).toBe('Error');
  expect(element.textContent).toBe('Broken');
});

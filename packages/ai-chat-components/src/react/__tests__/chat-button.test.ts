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
import ChatButton from '@carbon/ai-chat-components/es/react/chat-button.js';
import CustomChatButton from '@carbon/ai-chat-components/es-custom/react/chat-button.js';
import type ChatButtonElement from '@carbon/ai-chat-components/es/components/chat-button/src/chat-button.js';

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

test.each([
  ['es', ChatButton, 'cds-aichat-button'],
  ['es-custom', CustomChatButton, 'cds-custom-aichat-button'],
])(
  '%s wrapper passes Boolean selection before, during, and after a pick',
  async (_tree, Wrapper, tag) => {
    const onClick = jest.fn();
    const render = async (isSelected: boolean) => {
      await act(async () => {
        root.render(
          React.createElement(
            Wrapper,
            { isQuickAction: true, isSelected, onClick },
            'Choice'
          )
        );
      });
      const button = container.querySelector(tag) as ChatButtonElement;
      await button.updateComplete;
      return button;
    };

    const unpicked = await render(false);
    expect(React.version).toMatch(/^19\./);
    expect(unpicked.isSelected).toBe(false);
    expect(unpicked.inert).toBe(false);
    expect(unpicked.tabIndex).toBe(0);
    unpicked.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    const picked = await render(true);
    expect(picked.isSelected).toBe(true);
    expect(picked.inert).toBe(true);
    expect(picked.tabIndex).toBe(-1);
    picked.click();
    expect(onClick).toHaveBeenCalledTimes(1);

    const cleared = await render(false);
    expect(cleared.isSelected).toBe(false);
    expect(cleared.inert).toBe(false);
    expect(cleared.tabIndex).toBe(0);
    cleared.click();
    expect(onClick).toHaveBeenCalledTimes(2);
  }
);

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
import ChatHeader from '@carbon/ai-chat-components/es/react/chat-header.js';
import type ChatHeaderElement from '@carbon/ai-chat-components/es/components/chat-shell/src/chat-header.js';
import type ToolbarElement from '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';

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

test('clears omitted actions on mount and after an action is removed', async () => {
  const onClick = jest.fn();
  const action = {
    text: 'Run action',
    icon: {
      elem: 'svg',
      attrs: { viewBox: '0 0 16 16', width: '16', height: '16' },
      content: [{ elem: 'path', attrs: { d: 'M2 8h12' } }],
    },
    onClick,
    testId: 'header-action',
  };
  const render = async (actions?: (typeof action)[]) => {
    await act(async () => {
      root.render(React.createElement(ChatHeader, { actions }));
    });
    const header = container.querySelector(
      'cds-aichat-chat-header'
    ) as ChatHeaderElement;
    await header.updateComplete;
    const toolbar = header.shadowRoot!.querySelector(
      'cds-aichat-toolbar'
    ) as ToolbarElement;
    await toolbar.updateComplete;
    return { header, toolbar };
  };

  const initial = await render();
  expect(initial.header.actions).toEqual([]);
  expect(initial.toolbar.actions).toEqual([]);

  const added = await render([action]);
  const button = added.toolbar.shadowRoot!.querySelector<HTMLElement>(
    '[data-testid="header-action"]'
  )!;
  expect(button).not.toBeNull();
  button.click();
  expect(onClick).toHaveBeenCalledTimes(1);

  const removed = await render();
  expect(removed.header.actions).toEqual([]);
  expect(removed.toolbar.actions).toEqual([]);
  expect(
    removed.toolbar.shadowRoot!.querySelector('[data-testid="header-action"]')
  ).toBeNull();
});

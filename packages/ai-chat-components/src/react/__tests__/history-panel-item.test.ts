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
import HistoryPanelItem from '@carbon/ai-chat-components/es/react/history/history-panel-item.js';
import type HistoryPanelItemElement from '@carbon/ai-chat-components/es/components/chat-history/src/history-panel-item.js';

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

test('forwards disabled action updates to the same element and preserves onMenuAction', async () => {
  const onMenuAction = jest.fn();
  let originalElement: HistoryPanelItemElement | undefined;
  let expectedEvents = 0;
  for (const disabled of [false, true, false]) {
    const actions = [{ text: 'Delete', delete: true, disabled }];
    await act(async () =>
      root.render(
        React.createElement(HistoryPanelItem, {
          id: 'chat-1',
          name: 'My chat',
          actions,
          onMenuAction,
        })
      )
    );
    const element = container.querySelector(
      'cds-aichat-history-panel-item'
    ) as HistoryPanelItemElement;
    await element.updateComplete;
    if (originalElement) {
      expect(element).toBe(originalElement);
    }
    originalElement = element;
    expect(element.actions).toBe(actions);
    const menuItem = element.shadowRoot!.querySelector(
      'cds-overflow-menu-item'
    )!;
    await (menuItem as unknown as { updateComplete: Promise<boolean> })
      .updateComplete;
    expect(menuItem.shadowRoot!.querySelector('button')!.disabled).toBe(
      disabled
    );
    menuItem.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );
    if (!disabled) {
      expectedEvents++;
    }
    expect(onMenuAction).toHaveBeenCalledTimes(expectedEvents);
  }
  expect(onMenuAction).toHaveBeenCalledTimes(2);
  expect(onMenuAction.mock.calls[0][0].detail).toEqual({
    action: 'Delete',
    itemId: 'chat-1',
    itemName: 'My chat',
    element: originalElement,
  });
});

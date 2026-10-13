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
import ConversationalSearchShell from '@carbon/ai-chat-components/es/react/conversational-search-shell.js';
import ConversationalSearchShellElement from '@carbon/ai-chat-components/es/components/conversational-search/src/conversational-search-shell.js';

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

test('forwards the controlled props, slots, and the toggle callback', async () => {
  const onCitationsToggle = jest.fn();
  const render = (citationsOpen: boolean) =>
    root.render(
      React.createElement(
        ConversationalSearchShell,
        {
          citationsOpen,
          showCitationsToggle: true,
          citationsLabel: 'Sources',
          toggleLabel: 'Toggle sources',
          onCitationsToggle,
        },
        React.createElement('p', null, 'Answer'),
        React.createElement('p', { slot: 'citations' }, 'Source content'),
        React.createElement('p', { slot: 'answer-error' }, 'Answer incomplete')
      )
    );
  await act(async () => render(false));
  const element = container.querySelector(
    'cds-aichat-conversational-search-shell'
  ) as ConversationalSearchShellElement;
  await element.updateComplete;
  expect(element.citationsOpen).toBe(false);
  expect(element.showCitationsToggle).toBe(true);
  expect(element.citationsLabel).toBe('Sources');
  expect(element.toggleLabel).toBe('Toggle sources');
  expect(element.querySelector('p')?.textContent).toBe('Answer');
  expect(
    element
      .shadowRoot!.querySelector<HTMLSlotElement>('slot[name="citations"]')!
      .assignedElements()[0].textContent
  ).toBe('Source content');
  expect(
    element
      .shadowRoot!.querySelector<HTMLSlotElement>('slot[name="answer-error"]')!
      .assignedElements()[0].textContent
  ).toBe('Answer incomplete');
  const citationsRegion = element.shadowRoot!.querySelector(
    'slot[name="citations"]'
  )!.parentElement!;
  expect(citationsRegion.hidden).toBe(true);
  element.shadowRoot!.querySelector('button')!.click();
  expect(onCitationsToggle).toHaveBeenCalledTimes(1);
  expect(onCitationsToggle.mock.calls[0][0].detail).toEqual({ open: true });
  expect(element.citationsOpen).toBe(false);
  expect(citationsRegion.hidden).toBe(true);
  await act(async () => render(true));
  await element.updateComplete;
  expect(citationsRegion.hidden).toBe(false);
  element.shadowRoot!.querySelector('button')!.click();
  expect(onCitationsToggle).toHaveBeenCalledTimes(2);
  expect(onCitationsToggle.mock.calls[1][0].detail).toEqual({ open: false });
  expect(element.citationsOpen).toBe(true);
  await element.updateComplete;
  expect(citationsRegion.hidden).toBe(false);
});

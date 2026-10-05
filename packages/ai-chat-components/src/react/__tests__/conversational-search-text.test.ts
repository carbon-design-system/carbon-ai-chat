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
import ConversationalSearchText from '@carbon/ai-chat-components/es/react/conversational-search-text.js';
import ConversationalSearchTextElement from '@carbon/ai-chat-components/es/components/conversational-search-text/src/conversational-search-text.js';

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

test('forwards the controlled props, slot, and both event callbacks', async () => {
  const onCitationsToggle = jest.fn();
  const onCitationsScroll = jest.fn();
  const render = (citationsOpen: boolean) =>
    root.render(
      React.createElement(
        ConversationalSearchText,
        {
          citationsOpen,
          showCitationsToggle: true,
          citationsLabel: 'Sources',
          toggleLabel: 'Toggle sources',
          toggleId: 'sources-1',
          streaming: true,
          onCitationsToggle,
          onCitationsScroll,
        },
        React.createElement('p', null, 'Answer')
      )
    );
  await act(async () => render(false));
  const element = container.querySelector(
    'cds-aichat-conversational-search-text'
  ) as ConversationalSearchTextElement;
  await element.updateComplete;
  expect(element.citationsOpen).toBe(false);
  expect(element.showCitationsToggle).toBe(true);
  expect(element.citationsLabel).toBe('Sources');
  expect(element.toggleLabel).toBe('Toggle sources');
  expect(element.toggleId).toBe('sources-1');
  expect(element.streaming).toBe(true);
  expect(element.querySelector('p')?.textContent).toBe('Answer');
  element.shadowRoot!.querySelector('button')!.click();
  expect(onCitationsToggle).toHaveBeenCalledTimes(1);
  expect(onCitationsToggle.mock.calls[0][0].detail).toEqual({ open: true });
  expect(onCitationsScroll).toHaveBeenCalledTimes(1);
  expect(onCitationsScroll.mock.calls[0][0].detail).toBeNull();
  expect(element.citationsOpen).toBe(false);
  await act(async () => render(true));
  await element.updateComplete;
  element.shadowRoot!.querySelector('button')!.click();
  expect(onCitationsToggle).toHaveBeenCalledTimes(2);
  expect(onCitationsToggle.mock.calls[1][0].detail).toEqual({ open: false });
  expect(onCitationsScroll).toHaveBeenCalledTimes(1);
});

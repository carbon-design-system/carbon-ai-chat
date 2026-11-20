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
import CitationCard from '@carbon/ai-chat-components/es/react/citation-card.js';
import CitationCardElement from '@carbon/ai-chat-components/es/components/conversational-search/src/citation-card.js';

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

test('forwards the card props, slots, and both callbacks', async () => {
  const onCitationSelect = jest.fn();
  const onCitationExpand = jest.fn();
  await act(async () =>
    root.render(
      React.createElement(
        CitationCard,
        {
          index: 3,
          expandable: true,
          sourceLabel: 'View source',
          onCitationSelect,
          onCitationExpand,
        },
        React.createElement('div', { slot: 'title' }, 'Source title'),
        React.createElement('div', { slot: 'body' }, 'Cited text')
      )
    )
  );
  const element = container.querySelector(
    'cds-aichat-citation-card'
  ) as CitationCardElement;
  await element.updateComplete;
  expect(element.index).toBe(3);
  expect(element.expandable).toBe(true);
  expect(element.sourceLabel).toBe('View source');
  expect(
    element
      .shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
      .assignedElements()[0].textContent
  ).toBe('Source title');
  element.shadowRoot!.querySelector('button')!.click();
  expect(onCitationExpand).toHaveBeenCalledTimes(1);
  expect(onCitationExpand.mock.calls[0][0].detail).toEqual({ index: 3 });
  expect(onCitationSelect).toHaveBeenCalledTimes(1);
  expect(onCitationSelect.mock.calls[0][0].detail).toEqual({ index: 3 });
});

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
import MessagesShell from '@carbon/ai-chat-components/es/react/messages-shell.js';
import CDSAIChatMessagesShell from '@carbon/ai-chat-components/es/components/messages-shell/src/messages-shell.js';

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

test('forwards the handle labels, slots, and the scroll callback', async () => {
  const onMessagesShellScroll = jest.fn();
  await act(async () =>
    root.render(
      React.createElement(
        MessagesShell,
        {
          topHandleLabel: 'Start of messages',
          bottomHandleLabel: 'End of messages',
          onMessagesShellScroll,
        },
        React.createElement('p', null, 'Row'),
        React.createElement('p', { slot: 'error' }, 'Send failed')
      )
    )
  );
  const element = container.querySelector(
    'cds-aichat-messages-shell'
  ) as CDSAIChatMessagesShell;
  await element.updateComplete;

  expect(element.topHandleLabel).toBe('Start of messages');
  expect(element.bottomHandleLabel).toBe('End of messages');
  expect(
    element
      .shadowRoot!.querySelector<HTMLSlotElement>('slot[name="error"]')!
      .assignedElements()[0].textContent
  ).toBe('Send failed');

  element
    .shadowRoot!.querySelector('.cds-aichat-messages-shell__scroller')!
    .dispatchEvent(new Event('scroll'));
  expect(onMessagesShellScroll).toHaveBeenCalledTimes(1);
  expect(onMessagesShellScroll.mock.calls[0][0].detail).toEqual(
    expect.objectContaining({
      scrollTop: 0,
      isScrollable: false,
      isAtBottom: true,
    })
  );
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ButtonItemPostBackComponent } from '../ButtonItemPostBackComponent';
import {
  makeConfigStore,
  TestChatContext,
} from '../../../../__tests__/helpers/chat';
import {
  ButtonItemType,
  type MessageRequest,
  MessageResponseTypes,
} from '../../../../../types/messaging/Messages';

type ButtonHost = HTMLElement & { updateComplete: Promise<unknown> };

function getButtonHost(container: HTMLElement, is?: string): ButtonHost {
  return container.querySelector(
    is === 'standard-button' ? 'cds-button' : 'cds-aichat-button'
  ) as ButtonHost;
}

function renderPostBack(overrides: Record<string, unknown> = {}) {
  // useSelector reads the real store; dispatches go to the mock.
  const serviceManager = {
    store: { ...makeConfigStore({}), dispatch: vi.fn() },
    actions: { sendWithCatch: vi.fn() },
  } as any;
  const localMessageItem = {
    item: {
      response_type: MessageResponseTypes.BUTTON,
      button_type: ButtonItemType.POST_BACK,
      label: 'Visible label',
      value: { input: { text: 'sent text' } },
      ...overrides,
    },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;
  // The item's view flags, which the message renderer passes in.
  const flags: { optionSelected?: MessageRequest } = {};

  const renderComponent = () => (
    <TestChatContext serviceManager={serviceManager}>
      <ButtonItemPostBackComponent
        localMessageItem={localMessageItem}
        isMessageForInput={true}
        requestFocus={vi.fn()}
        optionSelected={flags.optionSelected}
      />
    </TestChatContext>
  );
  return { ...render(renderComponent()), flags, renderComponent };
}

afterEach(() => {
  vi.restoreAllMocks();
});

it.each([undefined, 'standard-button'])(
  'reports a failed pressed-state update for %s buttons',
  async (is) => {
    const { container, flags, renderComponent, rerender } = renderPostBack({
      is,
    });
    const host = getButtonHost(container, is);
    const error = new Error('Button update failed');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(host, 'updateComplete', {
      configurable: true,
      get: () => Promise.reject(error),
    });

    flags.optionSelected = {
      input: { text: 'sent text' },
      history: { label: 'Visible label' },
    };
    rerender(renderComponent());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'The post-back button could not update its pressed state.'
        ),
        error
      );
    });
  }
);

it('omits a malformed post-back and reports the recovery', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { container } = renderPostBack({
    label: '',
    value: { input: { text: '' } },
  });

  expect(container.querySelector('cds-aichat-button, cds-button')).toBeNull();
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      'A post-back button has no label or input text, so the chat did not render it.'
    )
  );
});

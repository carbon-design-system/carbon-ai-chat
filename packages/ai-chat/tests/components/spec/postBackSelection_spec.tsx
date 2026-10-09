/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { ButtonItemPostBackComponent } from '../../../src/chat/components/responseTypes/button/ButtonItemPostBackComponent';
import { ServiceManagerContext } from '../../../src/chat/contexts/ServiceManagerContext';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { makeConfigStore } from '../../test_helpers';
import {
  ButtonItemType,
  MessageResponseTypes,
  SelectionDisplay,
} from '../../../src/types/messaging/Messages';

type ButtonHost = HTMLElement & { updateComplete: Promise<unknown> };

async function getFocusableButton(
  container: HTMLElement,
  is?: string
): Promise<{ host: ButtonHost; button: HTMLButtonElement }> {
  const host = container.querySelector(
    is === 'standard-button' ? 'cds-button' : 'cds-aichat-button'
  ) as ButtonHost;
  await host.updateComplete;
  const button = host.shadowRoot?.querySelector('button') as HTMLButtonElement;
  return { host, button };
}

function renderPostBack(overrides: Record<string, unknown> = {}) {
  const configStore = makeConfigStore({});
  const dispatch = jest.fn();
  const sendWithCatch = jest.fn();
  const requestFocus = jest.fn();
  const serviceManager = {
    store: { dispatch },
    actions: { sendWithCatch },
  } as any;
  const localMessageItem = {
    item: {
      response_type: MessageResponseTypes.BUTTON,
      button_type: ButtonItemType.POST_BACK,
      label: 'Visible label',
      value: { input: { text: 'sent text', structured_data: { fields: [] } } },
      ...overrides,
    },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;

  const renderComponent = () => (
    <StoreProvider store={configStore}>
      <ServiceManagerContext.Provider value={serviceManager}>
        <ButtonItemPostBackComponent
          localMessageItem={localMessageItem}
          isMessageForInput={true}
          requestFocus={requestFocus}
        />
      </ServiceManagerContext.Provider>
    </StoreProvider>
  );
  const view = render(renderComponent());
  return {
    ...view,
    dispatch,
    localMessageItem,
    renderComponent,
    requestFocus,
    sendWithCatch,
  };
}

describe('post-back selected state', () => {
  it.each([undefined, 'standard-button'])(
    'exposes pressed state for %s buttons and disables the selected control',
    async (is) => {
      const { container, localMessageItem, renderComponent, rerender } =
        renderPostBack({ is });
      let { host, button } = await getFocusableButton(container, is);
      expect(host).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).not.toBeDisabled();

      localMessageItem.ui_state.optionSelected = {
        input: { text: 'sent text' },
        history: { label: 'Visible label' },
      };
      rerender(renderComponent());

      ({ host, button } = await getFocusableButton(container, is));
      expect(host).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toBeDisabled();
      expect(host).toHaveClass('cds-aichat--button-item--selected');
    }
  );

  it.each([undefined, 'standard-button'])(
    'reports a failed pressed-state update for %s buttons',
    async (is) => {
      const { container, localMessageItem, renderComponent, rerender } =
        renderPostBack({ is });
      const { host } = await getFocusableButton(container, is);
      const error = new Error('Button update failed');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      Object.defineProperty(host, 'updateComplete', {
        configurable: true,
        get: () => Promise.reject(error),
      });

      try {
        localMessageItem.ui_state.optionSelected = {
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
      } finally {
        delete host.updateComplete;
        consoleSpy.mockRestore();
      }
    }
  );

  it('keeps disabled and selected states separate', async () => {
    const { container, localMessageItem, rerender } = renderPostBack();
    rerender(
      <StoreProvider store={makeConfigStore({})}>
        <ServiceManagerContext.Provider value={{} as any}>
          <ButtonItemPostBackComponent
            localMessageItem={localMessageItem}
            isMessageForInput={false}
            requestFocus={jest.fn()}
          />
        </ServiceManagerContext.Provider>
      </StoreProvider>
    );

    const { host, button } = await getFocusableButton(container);
    expect(button).toBeDisabled();
    expect(host).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(host).not.toHaveClass('cds-aichat--button-item--selected');
  });

  it('selects before send and preserves input fields in input-text mode', () => {
    const { container, dispatch, requestFocus, sendWithCatch } = renderPostBack(
      {
        selection_display: SelectionDisplay.INPUT_TEXT,
        silent: true,
      }
    );

    fireEvent.click(container.querySelector('cds-aichat-button')!);

    const request = sendWithCatch.mock.calls[0][0];
    expect(request.input).toEqual({
      text: 'sent text',
      structured_data: { fields: [] },
    });
    expect(request.history).toEqual({
      label: 'sent text',
      related_message_id: 'response-id',
      is_choice_request: true,
      silent: true,
    });
    expect(requestFocus).toHaveBeenCalled();
    expect(dispatch.mock.invocationCallOrder[0]).toBeLessThan(
      sendWithCatch.mock.invocationCallOrder[0]
    );
  });

  it('omits a malformed post-back and reports the recovery', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderPostBack({ label: '', value: { input: { text: '' } } });

    expect(
      document.querySelector('cds-aichat-button, cds-button')
    ).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('dispatches selected state before a rejected send and does not roll it back', () => {
    const { container, dispatch, sendWithCatch } = renderPostBack({
      silent: true,
    });
    const rejectedSend = Promise.reject(new Error('send failed'));
    void rejectedSend.catch(() => {});
    sendWithCatch.mockReturnValue(rejectedSend);

    fireEvent.click(container.querySelector('cds-aichat-button')!);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.invocationCallOrder[0]).toBeLessThan(
      sendWithCatch.mock.invocationCallOrder[0]
    );
  });
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OptionComponent } from '../../../src/chat/components/responseTypes/options/OptionComponent';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { makeConfigStore } from '../../test_helpers';
import {
  MessageResponseTypes,
  OptionItemPreference,
  SelectionDisplay,
} from '../../../src/types/messaging/Messages';

jest.mock('@carbon/ai-chat-components/es/react/chat-button.js', () => ({
  __esModule: true,
  CHAT_BUTTON_KIND: { TERTIARY: 'tertiary' },
  CHAT_BUTTON_SIZE: { SMALL: 'sm' },
  default: ({ children, isselected, ...props }: any) => (
    <button type="button" data-selected={String(isselected)} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../../../src/chat/components/carbon/Dropdown', () => ({
  DropdownItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  Dropdown: ({ children, onSelected, onToggled, ...props }: any) => (
    <select
      aria-label={props['aria-label']}
      disabled={props.disabled}
      value={props.value || ''}
      onChange={(event) => {
        const option = event.currentTarget.selectedOptions[0];
        onSelected({
          detail: {
            item: { textContent: option.textContent, value: option.value },
          },
        });
        onToggled({ detail: { open: false } });
      }}>
      <option value="" />
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, { value: String(index) })
      )}
    </select>
  ),
}));

jest.mock('../../../src/chat/components/helpers/TextBlock/TextBlock', () => ({
  TextBlock: ({ title, description }: any) => (
    <>
      <span>{title}</span>
      <span>{description}</span>
    </>
  ),
}));

function renderOptions(
  options: any[],
  preference = OptionItemPreference.BUTTON
) {
  const store = makeConfigStore({});
  const sendWithCatch = jest.fn();
  const requestInputFocus = jest.fn();
  const serviceManager = {
    namespace: { suffix: '' },
    actions: { sendWithCatch },
  } as any;
  const localMessage = {
    item: {
      response_type: MessageResponseTypes.OPTION,
      title: 'Choose one',
      description: 'Choice description',
      preference,
      options,
    },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;

  const renderComponent = (disableUserInputs = false) => (
    <StoreProvider store={store}>
      <OptionComponent
        localMessage={localMessage}
        originalMessage={{ id: 'response-id' } as any}
        disableUserInputs={disableUserInputs}
        requestInputFocus={requestInputFocus}
        serviceManager={serviceManager}
      />
    </StoreProvider>
  );
  const view = render(renderComponent());

  return {
    ...view,
    localMessage,
    renderComponent,
    requestInputFocus,
    sendWithCatch,
  };
}

describe('choice selection controls', () => {
  it('keeps control text label-first and sends the original option', () => {
    const original = {
      label: 'Visible label',
      selection_display: SelectionDisplay.INPUT_TEXT,
      silent: true,
      value: {
        input: {
          text: 'sent text',
          structured_data: { fields: [] as any[] },
          display_content: { type: 'doc' },
        },
      },
    };
    const { sendWithCatch } = renderOptions([original]);

    fireEvent.click(screen.getByRole('button', { name: 'Visible label' }));

    expect(sendWithCatch).toHaveBeenCalledWith(
      expect.objectContaining({
        input: original.value.input,
        history: {
          label: 'sent text',
          related_message_id: 'response-id',
          is_choice_request: true,
          silent: true,
        },
      }),
      expect.anything(),
      { setValueSelectedForMessageID: 'local-id' }
    );
  });

  it('maps a dropdown event back to the complete original option', () => {
    const original = {
      label: 'Visible label',
      selection_display: SelectionDisplay.INPUT_TEXT,
      silent: true,
      value: {
        input: {
          text: 'sent text',
          structured_data: { fields: [{ id: 'field', value: 1 }] },
          display_content: { type: 'doc' },
        },
      },
    };
    const { sendWithCatch } = renderOptions(
      [original],
      OptionItemPreference.DROPDOWN
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '0' },
    });

    expect(sendWithCatch).toHaveBeenCalledWith(
      expect.objectContaining({
        input: original.value.input,
        history: expect.objectContaining({
          label: 'sent text',
          silent: true,
        }),
      }),
      expect.anything(),
      expect.anything()
    );
  });

  it('uses option position as the dropdown identity when values repeat', () => {
    const options = [
      { label: 'First', value: { input: { text: 'same' } } },
      { label: 'Second', value: { input: { text: 'same' } } },
    ];
    const { sendWithCatch } = renderOptions(
      options,
      OptionItemPreference.DROPDOWN
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '1' },
    });

    expect(sendWithCatch).toHaveBeenCalledWith(
      expect.objectContaining({ input: options[1].value.input }),
      expect.anything(),
      expect.anything()
    );
  });

  it('renders title and description but no control when every option is invalid', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderOptions([{ label: '', value: { input: { text: '' } } }]);

    expect(screen.getByText('Choose one')).toBeInTheDocument();
    expect(screen.getByText('Choice description')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('marks at most the first matching button selected', () => {
    const { localMessage, rerender } = renderOptions([
      { label: 'First', value: { input: { text: 'same' } } },
      { label: 'Second', value: { input: { text: 'same' } } },
    ]);
    localMessage.ui_state.optionSelected = {
      input: { text: 'same' },
      history: {},
    };

    const store = makeConfigStore({});
    rerender(
      <StoreProvider store={store}>
        <OptionComponent
          localMessage={localMessage}
          originalMessage={{ id: 'response-id' } as any}
          disableUserInputs={false}
          requestInputFocus={jest.fn()}
          serviceManager={{ actions: { sendWithCatch: jest.fn() } } as any}
        />
      </StoreProvider>
    );

    expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute(
      'data-selected',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute(
      'data-selected',
      'false'
    );
  });

  it.each([false, true])(
    'keeps the selected and disabled state when a silent=%s send rejects',
    (silent) => {
      const {
        localMessage,
        renderComponent,
        requestInputFocus,
        rerender,
        sendWithCatch,
      } = renderOptions([
        { label: 'Choice', value: { input: { text: 'choice' } }, silent },
      ]);
      const rejectedSend = Promise.reject(new Error('send failed'));
      void rejectedSend.catch(() => {});
      sendWithCatch.mockReturnValue(rejectedSend);

      fireEvent.click(screen.getByRole('button', { name: 'Choice' }));

      expect(sendWithCatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { setValueSelectedForMessageID: 'local-id' }
      );
      localMessage.ui_state.optionSelected = sendWithCatch.mock.calls[0][0];
      rerender(renderComponent(true));

      expect(screen.getByRole('button', { name: 'Choice' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Choice' })).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(requestInputFocus).toHaveBeenCalled();
    }
  );
});

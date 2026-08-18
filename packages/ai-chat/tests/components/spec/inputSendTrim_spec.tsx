/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression: the text handed to onSendInput must be trimmed, matching the
 * 1.18 behaviour.
 *
 * sendCurrentValue() reads rawInputValueRef.current and passes it to
 * onSendInput. The fix adds a .trim() at that read so leading/trailing
 * whitespace (and Shift+Enter trailing newlines) never reach the host.
 *
 * Tested by capturing the onChange / onSendIntent props that Input.tsx
 * passes to the mock PromptLine element, calling them directly in the test,
 * and asserting onSendInput receives the trimmed value.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';

import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { ServiceManagerContext } from '../../../src/chat/contexts/ServiceManagerContext';
import { IntlProvider } from '../../../src/chat/providers/IntlProvider';
import { AriaAnnouncerContext } from '../../../src/chat/contexts/AriaAnnouncerContext';
import { createIntl } from '../../../src/chat/utils/i18n';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const testIntl = createIntl({ locale: 'en', messages: {} });

// ---------------------------------------------------------------------------
// Capture the onChange / onSendIntent props wired to PromptLine by Input.tsx
// ---------------------------------------------------------------------------

type MockPromptLineProps = {
  onChange?: (event: CustomEvent<{ rawValue: string }>) => void;
  onSendIntent?: (event: CustomEvent) => void;
  [key: string]: unknown;
};
let capturedOnChange: MockPromptLineProps['onChange'] | undefined;
let capturedOnSendIntent: MockPromptLineProps['onSendIntent'] | undefined;
const clearContentSpy = jest.fn();

jest.mock('@carbon/ai-chat-components/es/react/prompt-line-shell.js', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement('div', null, children),
}));

jest.mock('@carbon/ai-chat-components/es/react/prompt-line.js', () => {
  const MockPromptLine = React.forwardRef(
    (
      props: MockPromptLineProps,
      ref: React.Ref<unknown>
    ): React.ReactElement => {
      // Capture the callbacks on every render so we always have the latest.
      capturedOnChange = props.onChange;
      capturedOnSendIntent = props.onSendIntent;
      React.useImperativeHandle(ref, () => ({ clearContent: clearContentSpy }));
      return React.createElement('div', null);
    }
  );
  MockPromptLine.displayName = 'MockPromptLine';
  return { __esModule: true, default: MockPromptLine };
});

jest.mock(
  '@carbon/ai-chat-components/es/react/hooks/useChatAutocomplete.js',
  () => ({
    __esModule: true,
    useChatAutocomplete: (): {
      onTriggerChange: () => void;
      autocompleteContent: null;
    } => ({
      onTriggerChange: () => {},
      autocompleteContent: null,
    }),
  })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderInput(onSendInput: jest.Mock) {
  const { Input: InputExport } =
    await import('../../../src/chat/components/input/Input');

  const store = makeConfigStore({});
  const serviceManager = {
    store,
    setInputFunctionsRef: jest.fn(),
  } as any;

  render(
    React.createElement(
      StoreProvider,
      { store },
      React.createElement(
        IntlProvider,
        { intl: testIntl },
        React.createElement(
          AriaAnnouncerContext.Provider,
          { value: jest.fn() },
          React.createElement(
            ServiceManagerContext.Provider,
            { value: serviceManager },
            React.createElement(InputExport, {
              disableInput: false,
              isInputVisible: true,
              disableSend: false,
              onSendInput,
            })
          )
        )
      )
    )
  );

  await waitFor(() => expect(capturedOnSendIntent).toBeDefined());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendCurrentValue trims leading/trailing whitespace', () => {
  beforeEach(() => {
    setupBeforeEach();
    clearContentSpy.mockClear();
    capturedOnChange = undefined;
    capturedOnSendIntent = undefined;
  });
  afterEach(setupAfterEach);

  it('trims surrounding spaces before calling onSendInput', async () => {
    const onSendInput = jest.fn();
    await renderInput(onSendInput);

    act(() => {
      // Seed the ref with a padded value via the onChange callback.
      capturedOnChange?.(
        new CustomEvent('change', {
          detail: { rawValue: '   padded message   ' },
        }) as CustomEvent<{ rawValue: string }>
      );
    });

    act(() => {
      // Fire the send intent — routes through handlePromptSendIntent →
      // sendCurrentValue → onSendInput with the trimmed value.
      capturedOnSendIntent?.(new CustomEvent('send-intent'));
    });

    expect(onSendInput).toHaveBeenCalledTimes(1);
    expect(onSendInput).toHaveBeenCalledWith('padded message', undefined);
  });

  it('strips a trailing newline left by Shift+Enter', async () => {
    const onSendInput = jest.fn();
    await renderInput(onSendInput);

    act(() => {
      capturedOnChange?.(
        new CustomEvent('change', {
          detail: { rawValue: 'hello\n' },
        }) as CustomEvent<{ rawValue: string }>
      );
    });

    act(() => {
      capturedOnSendIntent?.(new CustomEvent('send-intent'));
    });

    expect(onSendInput).toHaveBeenCalledTimes(1);
    expect(onSendInput).toHaveBeenCalledWith('hello', undefined);
  });
});

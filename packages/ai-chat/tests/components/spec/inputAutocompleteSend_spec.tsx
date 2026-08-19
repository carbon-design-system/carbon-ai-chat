/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression: calling onSend from a renderCustomList callback must result in
 * the message being sent and the input being cleared.
 *
 * The regression path is:
 *   props.onSend(text)          — from renderCustomList
 *   → handleSend (useChatAutocomplete)
 *   → onSendItem (Input.tsx)
 *   → setRawInputValue(text) + rawInputValueRef.current = text
 *   → sendCurrentValue()       — reads ref, not stale state
 *   → onSendInput(text)        — fires customSendMessage
 *   → setRawInputValue('')     — clears the field
 *
 * Tested by capturing the onSendItem callback that Input.tsx passes into
 * useChatAutocomplete, calling it, and asserting that clearContent() was
 * called on the prompt-line element — the imperative clear inside
 * sendCurrentValue(). The pre-fix regression called onSendInput(text) directly
 * from onSendItem, bypassing sendCurrentValue() entirely, so clearContent()
 * was never reached.
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
// Mock all heavy Lit web components so Input renders without a real DOM/Tiptap
// ---------------------------------------------------------------------------

jest.mock('@carbon/ai-chat-components/es/react/prompt-line-shell.js', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement('div', null, children),
}));
// clearContent is the imperative clear called by sendCurrentValue() after send.
// If the regression is present (onSendItem calls onSendInput directly), this
// spy is never reached.
const clearContentSpy = jest.fn();
let capturedOnChange:
  | ((e: CustomEvent<{ rawValue: string; content?: unknown }>) => void)
  | undefined;

jest.mock('@carbon/ai-chat-components/es/react/prompt-line.js', () => {
  const MockPromptLine = React.forwardRef(
    (
      props: { onChange?: (e: unknown) => void },
      ref: React.Ref<unknown>
    ): React.ReactElement => {
      capturedOnChange = props.onChange as typeof capturedOnChange;
      React.useImperativeHandle(ref, () => ({ clearContent: clearContentSpy }));
      return React.createElement('div', null);
    }
  );
  MockPromptLine.displayName = 'MockPromptLine';
  return { __esModule: true, default: MockPromptLine };
});

// ---------------------------------------------------------------------------
// Spy on useChatAutocomplete to capture the onSendItem wired by Input.tsx
// ---------------------------------------------------------------------------

let capturedOnSendItem: ((text: string) => void) | undefined;

jest.mock(
  '@carbon/ai-chat-components/es/react/hooks/useChatAutocomplete.js',
  () => ({
    __esModule: true,
    useChatAutocomplete: (options: {
      onSendItem?: (text: string) => void;
    }): { onTriggerChange: () => void; autocompleteContent: null } => {
      capturedOnSendItem = options.onSendItem;
      return { onTriggerChange: () => {}, autocompleteContent: null };
    },
  })
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('input autocomplete send regression', () => {
  beforeEach(() => {
    setupBeforeEach();
    clearContentSpy.mockClear();
    capturedOnChange = undefined;
  });
  afterEach(setupAfterEach);

  it('onSendItem routes through sendCurrentValue and clears the input', async () => {
    const { Input: InputExport } =
      await import('../../../src/chat/components/input/Input');

    const store = makeConfigStore({});
    const onSendInput = jest.fn();
    const serviceManager = {
      store,
      setInputFunctionsRef: jest.fn(),
    } as any;

    capturedOnSendItem = undefined;

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

    await waitFor(() => expect(capturedOnSendItem).toBeDefined());

    act(() => {
      capturedOnSendItem?.('hello from autocomplete');
    });

    expect(onSendInput).toHaveBeenCalledTimes(1);
    // clearContent() is called inside sendCurrentValue() — the imperative clear.
    // If onSendItem bypasses sendCurrentValue() (the regression), this is never called.
    expect(clearContentSpy).toHaveBeenCalledTimes(1);
  });

  it('onSendItem passes only the item text — no stale editor JSONContent', async () => {
    const { Input: InputExport } =
      await import('../../../src/chat/components/input/Input');

    const store = makeConfigStore({});
    const onSendInput = jest.fn();
    const serviceManager = {
      store,
      setInputFunctionsRef: jest.fn(),
    } as any;

    capturedOnSendItem = undefined;

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

    await waitFor(() => expect(capturedOnSendItem).toBeDefined());

    // Simulate the user typing something in the editor first. This seeds
    // displayContentRef with a stale JSONContent doc. Without the fix,
    // onSendItem would forward this stale doc to onSendInput instead of
    // undefined, because sendCurrentValue() reads displayContentRef before
    // clearing it.
    const staleDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
    act(() => {
      capturedOnChange?.({
        detail: { rawValue: 'some typed text', content: staleDoc },
      } as CustomEvent<{ rawValue: string; content?: unknown }>);
    });

    // Now the user picks an autocomplete item instead of sending what they typed.
    act(() => {
      capturedOnSendItem?.('selected autocomplete item');
    });

    expect(onSendInput).toHaveBeenCalledTimes(1);
    const [sentText, sentDisplayContent] = onSendInput.mock.calls[0];
    expect(sentText).toBe('selected autocomplete item');
    // displayContent must be undefined — the selected item has no rich doc.
    expect(sentDisplayContent).toBeUndefined();
  });
});

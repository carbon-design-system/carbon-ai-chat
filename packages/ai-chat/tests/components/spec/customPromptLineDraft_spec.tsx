/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { ServiceManagerContext } from '../../../src/chat/contexts/ServiceManagerContext';
import { IntlProvider } from '../../../src/chat/providers/IntlProvider';
import { AriaAnnouncerContext } from '../../../src/chat/contexts/AriaAnnouncerContext';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { selectInputState } from '../../../src/chat/store/selectors';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import {
  makeConfigStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

const testIntl = createIntl({ locale: 'en', messages: {} });
const plain = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'parked draft' }] },
  ],
};
const rich = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'parked draft', marks: [{ type: 'bold' }] },
      ],
    },
  ],
};
let ready: Promise<boolean>;
let upgrade: Promise<any>;
let capturedSend: (event: CustomEvent) => void;
let capturedChange: (event: CustomEvent) => void;
const ensureEditor = jest.fn();
const setContent = jest.fn();

jest.mock('@carbon/ai-chat-components/es/react/prompt-line-shell.js', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('@carbon/ai-chat-components/es/react/prompt-line.js', () => {
  const Prompt = React.forwardRef((props: any, ref: React.Ref<unknown>) => {
    const [value, setValue] = React.useState('');
    const propsRef = React.useRef(props);
    propsRef.current = props;
    const currentValue = React.useRef(value);
    capturedSend = props.onSendIntent;
    capturedChange = props.onChange;
    React.useImperativeHandle(
      ref,
      () => ({
        updateComplete: ready,
        getValue: () => currentValue.current,
        getEditor: (): null => null,
        ensureEditor: () => {
          ensureEditor();
          return upgrade;
        },
        setContent: (content: string | JSONContent) => {
          setContent(content);
          const rawValue =
            typeof content === 'string'
              ? content
              : (content.content?.[0]?.content?.[0]?.text ?? '');
          currentValue.current = rawValue;
          setValue(rawValue);
          propsRef.current.onChange(
            new CustomEvent('change', {
              detail: {
                rawValue,
                content:
                  typeof content === 'string'
                    ? {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [{ type: 'text', text: rawValue }],
                          },
                        ],
                      }
                    : content,
              },
            })
          );
        },
        clearContent: () => {
          currentValue.current = '';
          setValue('');
        },
      }),
      []
    );
    return <textarea aria-label="Draft" value={value} readOnly />;
  });
  Prompt.displayName = 'Prompt';
  return { __esModule: true, default: Prompt };
});
jest.mock(
  '@carbon/ai-chat-components/es/react/hooks/useChatAutocomplete.js',
  () => ({
    useChatAutocomplete: (): {
      onTriggerChange: () => void;
      autocompleteContent: null;
    } => ({ onTriggerChange: () => {}, autocompleteContent: null }),
  })
);

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve: (value: T) => resolve(value) };
}

async function setup(
  content: JSONContent = plain,
  visible = true,
  restoreDraft = true
) {
  const { Input } = await import('../../../src/chat/components/input/Input');
  const store = makeConfigStore({});
  store.dispatch(
    actions.updateInputState({ rawValue: 'parked draft', content }, false)
  );
  let inputFunctions: unknown;
  const wrapper = document.createElement('div');
  const serviceManager = {
    store,
    writeableElements: { [WriteableElementName.CUSTOM_PROMPT_LINE]: wrapper },
    instance: {
      writeableElements: { [WriteableElementName.CUSTOM_PROMPT_LINE]: wrapper },
    },
    setInputFunctionsRef: jest.fn((value) => {
      inputFunctions = value;
    }),
    getInputFunctionsRef: () => inputFunctions,
  } as any;
  const onSendInput = jest.fn();
  const tree = (isInputVisible: boolean) => (
    <StoreProvider store={store}>
      <IntlProvider intl={testIntl}>
        <AriaAnnouncerContext.Provider value={jest.fn()}>
          <ServiceManagerContext.Provider value={serviceManager}>
            <Input
              disableInput={false}
              disableSend={false}
              isInputVisible={isInputVisible}
              trackInputState
              restoreDraft={restoreDraft}
              onSendInput={onSendInput}
            />
          </ServiceManagerContext.Provider>
        </AriaAnnouncerContext.Provider>
      </IntlProvider>
    </StoreProvider>
  );
  const view = render(tree(visible));
  return {
    ...view,
    store,
    serviceManager,
    wrapper,
    onSendInput,
    setVisible: (next: boolean) => view.rerender(tree(next)),
  };
}

describe('custom prompt line draft restoration', () => {
  beforeEach(() => {
    setupBeforeEach();
    ready = Promise.resolve(true);
    upgrade = Promise.resolve({});
    ensureEditor.mockClear();
    setContent.mockClear();
  });
  afterEach(setupAfterEach);

  it('restores visible plain text after the surface is ready without loading an editor', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const view = await setup();
    expect(setContent).not.toHaveBeenCalled();
    await act(async () => {
      gate.resolve(true);
    });
    expect(view.getByRole('textbox')).toHaveValue('parked draft');
    expect(ensureEditor).not.toHaveBeenCalled();
  });

  it('restores the rich document and sends its display content', async () => {
    const view = await setup(rich);
    await waitFor(() =>
      expect(view.getByRole('textbox')).toHaveValue('parked draft')
    );
    expect(ensureEditor).toHaveBeenCalledTimes(1);
    expect(setContent).toHaveBeenCalledWith(rich);
    act(() => capturedSend(new CustomEvent('send-intent')));
    expect(view.onSendInput).toHaveBeenCalledWith('parked draft', rich);
  });

  it('keeps restoration pending while the fallback is hidden', async () => {
    const view = await setup(rich, false);
    expect(setContent).not.toHaveBeenCalled();
    view.setVisible(true);
    await waitFor(() =>
      expect(view.getByRole('textbox')).toHaveValue('parked draft')
    );
    expect(setContent).toHaveBeenCalledWith(rich);
  });

  it('restores again when visibility remounts the built-in surface', async () => {
    const view = await setup();
    await waitFor(() =>
      expect(view.getByRole('textbox')).toHaveValue('parked draft')
    );
    view.setVisible(false);
    view.setVisible(true);
    await waitFor(() =>
      expect(view.getByRole('textbox')).toHaveValue('parked draft')
    );
  });

  it('cancels restoration when the input unmounts before readiness', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const view = await setup();
    view.unmount();
    await act(async () => {
      gate.resolve(true);
    });
    expect(setContent).not.toHaveBeenCalled();
    expect(view.serviceManager.getInputFunctionsRef()).toBeNull();
  });

  it('leaves normal first mounts unchanged', async () => {
    const view = await setup(plain, true, false);
    await act(async () => {});
    expect(view.getByRole('textbox')).toHaveValue('');
    expect(setContent).not.toHaveBeenCalled();
  });

  it('reads the current draft after readiness, including a cleared parked draft', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const view = await setup(rich);
    act(() =>
      view.store.dispatch(
        actions.updateInputState(
          { rawValue: '', content: { type: 'doc', content: [] } },
          false
        )
      )
    );
    setContent.mockClear();
    await act(async () => {
      gate.resolve(true);
    });
    expect(setContent).toHaveBeenLastCalledWith('');
    expect(ensureEditor).not.toHaveBeenCalled();
  });

  it('does not overwrite newer typing while the rich editor loads', async () => {
    const gate = deferred<any>();
    upgrade = gate.promise;
    const view = await setup(rich);
    await waitFor(() => expect(ensureEditor).toHaveBeenCalled());
    act(() =>
      capturedChange(
        new CustomEvent('change', {
          detail: { rawValue: 'new draft', content: plain },
        })
      )
    );
    await act(async () => {
      gate.resolve({});
    });
    expect(setContent).not.toHaveBeenCalledWith(rich);
    expect(selectInputState(view.store.getState()).rawValue).toBe('new draft');
  });

  it('cancels a restore when custom content returns during the upgrade', async () => {
    const gate = deferred<any>();
    upgrade = gate.promise;
    const view = await setup(rich);
    await waitFor(() => expect(ensureEditor).toHaveBeenCalled());
    view.wrapper.appendChild(document.createElement('input'));
    await act(async () => {
      gate.resolve({});
    });
    expect(setContent).not.toHaveBeenCalled();
  });

  it.each(['surface readiness', 'editor upgrade'])(
    'restores the current human-agent draft after switching during %s',
    async (phase) => {
      const gate = deferred<any>();
      if (phase === 'surface readiness') {
        ready = gate.promise;
      } else {
        upgrade = gate.promise;
      }
      const view = await setup(rich);
      if (phase === 'editor upgrade') {
        await waitFor(() => expect(ensureEditor).toHaveBeenCalled());
      }
      const agentDraft = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'agent draft', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      };
      act(() => {
        view.store.dispatch(
          actions.updateInputState(
            { rawValue: 'agent draft', content: agentDraft },
            true
          )
        );
        view.store.dispatch(
          actions.changeState({
            persistedToBrowserStorage: {
              humanAgentState: { isConnected: true },
            },
          })
        );
      });
      await act(async () => gate.resolve(true));
      await waitFor(() =>
        expect(view.getByRole('textbox')).toHaveValue('agent draft')
      );
      expect(setContent).not.toHaveBeenCalledWith(rich);
      expect(selectInputState(view.store.getState()).content).toEqual(
        agentDraft
      );
      expect(view.store.getState().assistantInputState.content).toEqual(rich);
      act(() => capturedSend(new CustomEvent('send-intent')));
      expect(view.onSendInput).toHaveBeenCalledWith('agent draft', agentDraft);
    }
  );

  it('clears built-in focus on unmount without clearing a newer handle', async () => {
    const view = await setup();
    await waitFor(() => expect(setContent).toHaveBeenCalled());
    act(() =>
      view.store.dispatch(actions.updateInputState({ focused: true }, false))
    );
    const replacement = {};
    view.serviceManager.setInputFunctionsRef(replacement);
    view.unmount();
    expect(selectInputState(view.store.getState()).focused).toBe(false);
    expect(view.serviceManager.getInputFunctionsRef()).toBe(replacement);
  });
});

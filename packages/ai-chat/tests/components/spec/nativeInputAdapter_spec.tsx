/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import Edit from '@carbon/icons-react/es/Edit';
import type { CarbonIconDescriptor } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type InputSendControl from '@carbon/ai-chat-components/es/components/prompt-line/src/send-control.js';
import { NativeInputAdapter } from '../../../src/chat/components/input/NativeInputAdapter';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import type InputActions from '../../../src/chat/components/input/native/InputActions';
import { ChatContext } from '../../../src/chat/contexts/ChatContext';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type {
  InputFunctions,
  InputProps,
} from '../../../src/chat/utils/inputTypes';
import type { InputConfig } from '../../../src/types/config/InputConfig';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class InputAdapterProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define(
  'test-native-input-adapter-provider',
  InputAdapterProvider
);
const states = new Set<ChatViewState>();
const owners = new Set<AutocompleteContent>();

async function flush(view: ChatInput) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    await view.querySelector<PromptLineElement>('cds-aichat-prompt-line')
      ?.updateComplete;
    await view.querySelector<InputActions>('cds-aichat-input-actions')
      ?.updateComplete;
  }
}

async function fixture(
  input: InputConfig = {},
  overrides: Partial<InputProps> = {},
  prepare?: (store: ReturnType<typeof makeConfigStore>) => void,
  lateContext = false
) {
  const store = makeConfigStore({ input });
  prepare?.(store);
  let currentHandle: InputFunctions | null = null;
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
    setInputFunctionsRef: jest.fn((handle) => {
      currentHandle = handle;
    }),
    getInputFunctionsRef: () => currentHandle,
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-input-adapter-provider'
  ) as InputAdapterProvider;
  if (!lateContext) {
    provider.provider.setValue(state);
  }
  document.body.append(provider);
  await provider.updateComplete;
  const owner = new AutocompleteContent(provider);
  owner.connect();
  owners.add(owner);
  const root = document.createElement('div');
  provider.shadowRoot.append(root);
  const ref = createRef<InputFunctions>();
  const props: InputProps = {
    disableInput: false,
    disableSend: false,
    isInputVisible: true,
    onSendInput: jest.fn(),
    onStopStreaming: async () => {},
    ...overrides,
  };
  const tree = (
    nextProps = props,
    nextRef: React.Ref<InputFunctions> = ref,
    key = 'input'
  ) => (
    <ChatContext.Provider value={state}>
      <NativeInputAdapter
        key={key}
        {...nextProps}
        contentOwner={owner}
        ref={nextRef}
      />
    </ChatContext.Provider>
  );
  const mounted = render(tree(), { container: root });
  const view = root.querySelector<ChatInput>('cds-aichat-chat-input');
  await act(async () => {
    await flush(view);
  });
  const changeConfig = async (next: Partial<InputConfig>) => {
    await act(async () => {
      const config = store.getState().config;
      store.dispatch(
        actions.changeState({
          config: {
            ...config,
            public: {
              ...config.public,
              input: { ...config.public.input, ...next },
            },
          },
        })
      );
    });
    await act(async () => {
      await flush(view);
    });
  };
  return {
    view,
    owner,
    manager,
    ref,
    props,
    tree,
    mounted,
    changeConfig,
    errorOccurred,
    root,
    provider,
    state,
  };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  cleanup();
  owners.forEach((owner) => owner.disconnect());
  owners.clear();
  states.forEach((state) => state.disconnect());
  states.clear();
  document.body.replaceChildren();
  setupAfterEach();
  jest.restoreAllMocks();
});

it('passes normalized icons and unchanged consumer callbacks to the actual native input', async () => {
  const renderCustomList = jest.fn((): null => null);
  const onClick = jest.fn();
  const item = { id: 'edit', label: 'Edit', avatar: Edit };
  const mention = { trigger: '@', items: [item], renderCustomList };
  const command = { trigger: '/', items: [item], renderCustomList };
  const autocomplete = { items: [item], renderCustomList };
  const starters = { items: [item], isOn: false, renderCustomList };
  const inputActions = [
    {
      id: 'edit',
      text: 'Edit',
      icon: Edit,
      onClick,
      fixed: true,
      testId: 'edit-action',
    },
    {
      id: 'link',
      text: 'Open',
      icon: Edit,
      href: 'https://example.test/',
      target: '_blank',
      disabled: true,
    },
  ];
  const { view, owner, errorOccurred } = await fixture({
    expanded: true,
    mention,
    command,
    autocomplete,
    starters,
    actions: inputActions,
  });

  for (const config of [
    view.mention,
    view.command,
    view.autocomplete,
    view.starters,
  ]) {
    const avatar = (config.items as (typeof item)[])[0]
      .avatar as unknown as CarbonIconDescriptor;
    expect(avatar.elem).toBe('svg');
    expect(avatar.attrs.width).toBe(16);
    expect(avatar.content.some((part) => part.elem === 'path')).toBe(true);
    expect(config.renderCustomList).toBe(renderCustomList);
  }
  expect(item.avatar).toBe(Edit);
  expect(view.contentOwner).toBe(owner);
  expect(
    view.querySelector('cds-aichat-native-autocomplete').contentOwner
  ).toBe(owner);
  expect(view.inputActions.map((action) => action.id)).toEqual([
    'edit',
    'link',
  ]);
  view.inputActions.forEach((action, index) => {
    expect(action).toEqual({
      ...inputActions[index],
      icon: expect.objectContaining({ elem: 'svg', size: 16 }),
    });
  });
  const nativeActions = view.querySelector<InputActions>(
    'cds-aichat-input-actions'
  );
  const button = nativeActions.querySelector<HTMLElement>(
    '[data-testid="edit-action"]'
  );
  const icon = button.querySelector('svg');
  expect(icon.getAttribute('width')).toBe('16');
  expect(icon.querySelector('path')).not.toBeNull();
  button.click();
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(renderCustomList).not.toHaveBeenCalled();
  expect(errorOccurred).not.toHaveBeenCalled();
});

it('keeps normalization identities until each existing memo dependency changes', async () => {
  const item = { id: 'edit', label: 'Edit', avatar: Edit };
  const mention = { trigger: '@', items: [item] };
  const command = { trigger: '/', items: [item] };
  const autocomplete = { items: [item] };
  const starters = { items: [item], isOn: false };
  const inputActions = [{ id: 'edit', text: 'Edit', icon: Edit }];
  const { view, props, tree, mounted, changeConfig } = await fixture({
    mention,
    command,
    autocomplete,
    starters,
    actions: inputActions,
  });
  const normalized = [
    view.mention,
    view.command,
    view.autocomplete,
    view.starters,
  ];
  const normalizedActions = view.inputActions;
  mounted.rerender(tree({ ...props, placeholder: 'Updated placeholder' }));
  await act(async () => {
    await flush(view);
  });
  normalized.forEach((config, index) => {
    expect(
      [view.mention, view.command, view.autocomplete, view.starters][index]
    ).toBe(config);
  });
  expect(view.inputActions).toBe(normalizedActions);

  await changeConfig({
    // The store drops deep-equal config patches; commit these new objects with a real change.
    isSendDisabled: true,
    mention: { ...mention },
    command: { ...command },
    autocomplete: { ...autocomplete },
    starters: { ...starters },
  });
  expect(view.mention).not.toBe(normalized[0]);
  expect(view.command).not.toBe(normalized[1]);
  expect(view.autocomplete).not.toBe(normalized[2]);
  expect(view.starters).toBe(normalized[3]);
  expect(view.inputActions).toBe(normalizedActions);
  await changeConfig({
    actions: [{ ...inputActions[0], text: 'Updated edit' }],
  });
  expect(view.inputActions).not.toBe(normalizedActions);
  let current = starters;
  for (const patch of [
    { items: [{ ...item, label: 'Updated starter' }] },
    { renderCustomList: (): null => null },
    { isOn: true },
    { disableDirectSend: true },
  ]) {
    const previous = view.starters;
    current = { ...current, ...patch };
    await changeConfig({ starters: current });
    expect(view.starters).not.toBe(previous);
  }
});

it('preserves undefined and empty action lists across config updates', async () => {
  const { view, changeConfig } = await fixture();
  expect(view.inputActions).toBeUndefined();
  expect(view.querySelector('cds-aichat-input-actions')).toBeNull();
  await changeConfig({ actions: [] });
  expect(view.inputActions).toEqual([]);
  expect(view.querySelector('cds-aichat-input-actions')).not.toBeNull();
  await changeConfig({ actions: undefined });
  expect(view.inputActions).toBeUndefined();
  expect(view.querySelector('cds-aichat-input-actions')).toBeNull();
});

it('seeds tracked send content and its length guard when React supplies the first props after connection', async () => {
  const { view, props, tree, mounted } = await fixture(
    {},
    { trackInputState: true, restoreDraft: false, maxInputChars: 4 },
    (store) => {
      store.dispatch(
        actions.updateInputState({ rawValue: 'seeded draft' }, false)
      );
    }
  );
  const control = view.querySelector<InputSendControl>(
    'cds-aichat-input-send-control'
  );
  expect(control.hasValidInput).toBe(true);
  expect(control.disableSend).toBe(true);
  control.dispatchEvent(new CustomEvent('cds-aichat-input-send'));
  expect(props.onSendInput).not.toHaveBeenCalled();

  mounted.rerender(tree({ ...props, maxInputChars: 20 }));
  await act(async () => {
    await flush(view);
  });
  expect(control.hasValidInput).toBe(true);
  expect(control.disableSend).toBe(false);
  control.dispatchEvent(new CustomEvent('cds-aichat-input-send'));
  expect(props.onSendInput).toHaveBeenCalledTimes(1);
  expect(props.onSendInput).toHaveBeenCalledWith('seeded draft', undefined);
});

it('forwards the native handle once and clears old refs when the ref or input detaches', async () => {
  const { view, ref, manager, props, tree, mounted } = await fixture();
  const handle = ref.current;
  expect(handle).toBe(view.inputFunctions);
  expect(manager.getInputFunctionsRef()).toBe(handle);
  expect(manager.setInputFunctionsRef).toHaveBeenCalledTimes(1);
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  const setContent = jest.spyOn(prompt, 'setContent');
  handle.setContent('Live draft');
  expect(setContent).toHaveBeenCalledWith('Live draft');

  mounted.rerender(tree({ ...props, placeholder: 'New placeholder' }));
  await act(async () => {
    await flush(view);
  });
  expect(ref.current).toBe(handle);
  expect(view.querySelector('cds-aichat-prompt-line')).toBe(prompt);
  const nextRef = jest.fn();
  mounted.rerender(tree({ ...props, isInputVisible: false }, nextRef));
  await act(async () => {
    await flush(view);
  });
  expect(ref.current).toBeNull();
  expect(nextRef).toHaveBeenLastCalledWith(handle);
  expect(handle.requestFocus()).toBe(false);
  expect(() => handle.setContent('Hidden')).toThrow(
    'Input is not currently rendered'
  );
  expect(manager.setInputFunctionsRef).toHaveBeenCalledTimes(1);

  mounted.unmount();
  await Promise.resolve();
  expect(nextRef).toHaveBeenLastCalledWith(null);
  expect(manager.getInputFunctionsRef()).toBeNull();
  expect(handle.getEditor()).toBeNull();
});

it('refreshes the forwarded handle after a real native detach and ignores the retired view after replacement', async () => {
  const { view, ref, root, manager, props, tree, mounted } = await fixture();
  const original = ref.current;
  await act(async () => {
    view.remove();
    await Promise.resolve();
  });
  expect(view.inputFunctions).toBeUndefined();
  expect(ref.current).toBeNull();
  expect(manager.getInputFunctionsRef()).toBeNull();
  expect(original.requestFocus()).toBe(false);

  await act(async () => {
    root.append(view);
    await flush(view);
  });
  const reconnected = ref.current;
  expect(reconnected).toBe(view.inputFunctions);
  expect(reconnected).not.toBe(original);
  expect(manager.getInputFunctionsRef()).toBe(reconnected);
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  const setContent = jest.spyOn(prompt, 'setContent');
  reconnected.setContent('Reconnected draft');
  expect(setContent).toHaveBeenCalledWith('Reconnected draft');
  expect(() => original.setContent('Stale')).toThrow(
    'Input is not currently rendered'
  );

  mounted.rerender(tree(props, ref, 'replacement'));
  const replacement = root.querySelector<ChatInput>('cds-aichat-chat-input');
  await act(async () => {
    await flush(replacement);
  });
  expect(replacement).not.toBe(view);
  expect(view.inputFunctions).toBeUndefined();
  expect(ref.current).toBe(replacement.inputFunctions);
  expect(ref.current).not.toBe(reconnected);
  expect(manager.getInputFunctionsRef()).toBe(ref.current);
});

it('publishes the actual handle when Lit context arrives after the React ref attaches', async () => {
  const { view, ref, provider, state, manager, errorOccurred } = await fixture(
    {},
    {},
    undefined,
    true
  );
  expect(view.inputFunctions).toBeUndefined();
  expect(ref.current).toBeNull();
  expect(manager.setInputFunctionsRef).not.toHaveBeenCalled();
  await act(async () => {
    provider.provider.setValue(state);
    await flush(view);
  });
  expect(ref.current).toBeDefined();
  expect(ref.current).not.toBeNull();
  expect(ref.current).toBe(view.inputFunctions);
  expect(manager.getInputFunctionsRef()).toBe(ref.current);
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  const setContent = jest.spyOn(prompt, 'setContent');
  ref.current.setContent('Late context draft');
  expect(setContent).toHaveBeenCalledWith('Late context draft');
  expect(errorOccurred).not.toHaveBeenCalled();
});

it('runs React 19 callback-ref cleanup on ref replacement and unmount without an extra null call', async () => {
  const { ref, props, tree, mounted } = await fixture();
  const handle = ref.current;
  const firstCleanup = jest.fn();
  const firstRef = jest.fn(() => firstCleanup);
  mounted.rerender(tree(props, firstRef));
  expect(ref.current).toBeNull();
  expect(firstRef).toHaveBeenCalledTimes(1);
  expect(firstRef).toHaveBeenCalledWith(handle);

  const nextCleanup = jest.fn();
  const nextRef = jest.fn(() => nextCleanup);
  mounted.rerender(tree(props, nextRef));
  expect(firstCleanup).toHaveBeenCalledTimes(1);
  expect(firstRef).toHaveBeenCalledTimes(1);
  expect(nextRef).toHaveBeenCalledTimes(1);
  expect(nextRef).toHaveBeenCalledWith(handle);
  mounted.unmount();
  await Promise.resolve();
  expect(nextCleanup).toHaveBeenCalledTimes(1);
  expect(nextRef).toHaveBeenCalledTimes(1);
  expect(firstCleanup).toHaveBeenCalledTimes(1);
});

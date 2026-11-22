/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type InputSendControl from '@carbon/ai-chat-components/es/components/prompt-line/src/send-control.js';
import { NativeInputConfigHarness } from '../../components/input/__tests__/helpers/NativeInputConfigHarness';
import type ChatInput from '../../components/input/ChatInput';
import type InputActions from '../../components/input/native/InputActions';
import { ChatContext } from '../../contexts/ChatContext';
import { ChatMountState } from '../../services/chatMountState';
import { AutocompleteContent } from '../../services/autocompleteContent';
import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import type { InputProps } from '../../utils/inputTypes';
import type { InputConfig } from '../../../types/config/InputConfig';
import { chatMountStateContext } from '../../../web-components/shared/chat-mount-state-context';
import { createIntl } from '../../../sdk/utils/i18n';
import actions from '../../../sdk/store/actions';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../__tests__/helpers/chat';

class InputAdapterProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define(
  'test-native-input-adapter-provider',
  InputAdapterProvider
);
const states = new Set<ChatMountState>();
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
  prepare?: (store: ReturnType<typeof makeConfigStore>) => void
) {
  const store = makeConfigStore({ input });
  prepare?.(store);
  const errorOccurred = vi.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-input-adapter-provider'
  ) as InputAdapterProvider;
  provider.provider.setValue(state);
  document.body.append(provider);
  await provider.updateComplete;
  const owner = new AutocompleteContent(provider);
  owner.connect();
  owners.add(owner);
  const root = document.createElement('div');
  provider.shadowRoot.append(root);
  const props: InputProps = {
    disableInput: false,
    disableSend: false,
    isInputVisible: true,
    onSendInput: vi.fn(),
    onStopStreaming: async () => {},
    ...overrides,
  };
  const tree = (nextProps = props) => (
    <ChatContext.Provider value={state}>
      <NativeInputConfigHarness {...nextProps} contentOwner={owner} />
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
  vi.restoreAllMocks();
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
  // The staged draft is restored once into the first surface.
  expect(props.onSendInput).toHaveBeenCalledWith('seeded draft', {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'seeded draft' }] },
    ],
  });
});

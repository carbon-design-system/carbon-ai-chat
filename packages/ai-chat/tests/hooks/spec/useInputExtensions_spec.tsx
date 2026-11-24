/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  createContext,
  Suspense,
  startTransition,
  useContext,
  useState,
} from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import { NativeInputConfigHarness } from '../../components/NativeInputConfigHarness';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { loadBuildCarbonExtensions } from '../../../src/chat/components/input/buildExtensionsLoader';
import { useInputConfig } from '../../../src/chat/hooks/useInputConfig';
import { ChatContext } from '../../../src/chat/contexts/ChatContext';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type {
  InputFunctions,
  InputProps,
} from '../../../src/chat/utils/inputTypes';
import { createIntl } from '../../../src/chat/utils/i18n';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import type {
  InputConfig,
  StartersConfig,
  TriggerSuggestionConfig,
} from '../../../src/types/config/InputConfig';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

jest.mock('../../../src/chat/hooks/useInputConfig', () => ({
  useInputConfig: jest.fn(),
}));

// Keep item references stable so a changed items array cannot mask a missing dependency.
const STARTER_ITEMS = [{ id: 's1', label: 'Summarize this' }];
const InputConfigContext = createContext<InputConfig>({});
const states = new Set<ChatViewState>();
const owners = new Set<AutocompleteContent>();

class InputExtensionsProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define(
  'test-native-input-extensions-provider',
  InputExtensionsProvider
);

function useTestInputConfig(): ReturnType<typeof useInputConfig> {
  const input = useContext(InputConfigContext);
  return {
    mention: input.mention,
    command: input.command,
    autocomplete: input.autocomplete,
    starters: input.starters,
    hostExtensions: input.tiptap?.extensions,
    isSendDisabledFromConfig: Boolean(input.isSendDisabled),
    actions: input.actions,
    expanded: Boolean(input.expanded),
  };
}

async function flush(view: ChatInput) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    await view.querySelector<PromptLineElement>('cds-aichat-prompt-line')
      ?.updateComplete;
  }
}

async function fixture(input: InputConfig) {
  await loadBuildCarbonExtensions();
  const store = makeConfigStore({ input });
  let currentHandle: InputFunctions | null = null;
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
    setInputFunctionsRef: (handle: InputFunctions | null) => {
      currentHandle = handle;
    },
    getInputFunctionsRef: () => currentHandle,
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-input-extensions-provider'
  ) as InputExtensionsProvider;
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
    onSendInput: jest.fn(),
    onStopStreaming: async () => {},
  };
  const mount = (content: React.ReactNode) =>
    render(content, {
      container: root,
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ChatContext.Provider value={state}>{children}</ChatContext.Provider>
      ),
    });
  const ready = async () => {
    const view = root.querySelector<ChatInput>('cds-aichat-chat-input');
    await act(async () => {
      await flush(view);
    });
    const prompt = view.querySelector<PromptLineElement>(
      'cds-aichat-prompt-line'
    );
    await act(async () => {
      await view.inputFunctions.ensureEditor();
      await flush(view);
    });
    expect(prompt.extensions.length).toBeGreaterThan(0);
    expect(errorOccurred).not.toHaveBeenCalled();
    return { view, prompt };
  };
  return { owner, props, mount, ready };
}

async function renderStarters(starters: StartersConfig) {
  const { owner, props, mount, ready } = await fixture({ starters });
  const tree = (config: StartersConfig) => (
    <InputConfigContext.Provider value={{ starters: config }}>
      <NativeInputConfigHarness {...props} contentOwner={owner} />
    </InputConfigContext.Provider>
  );
  const mounted = mount(tree(starters));
  const { view, prompt } = await ready();
  const rerender = async (next: StartersConfig) => {
    mounted.rerender(tree(next));
    await act(async () => {
      await flush(view);
    });
  };
  return { view, prompt, rerender };
}

beforeEach(() => {
  setupBeforeEach();
  jest.mocked(useInputConfig).mockImplementation(useTestInputConfig);
});
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

describe('native input starter memo dependencies', () => {
  it('recomputes when only isOn changes', async () => {
    const { view, rerender } = await renderStarters({
      items: STARTER_ITEMS,
      isOn: true,
    });
    expect(view.starters.isOn).toBe(true);
    await rerender({ items: STARTER_ITEMS, isOn: false });
    expect(view.starters.isOn).toBe(false);
  });

  it('reuses normalized starters and extensions when a fresh config carries the same values', async () => {
    const { view, prompt, rerender } = await renderStarters({
      items: STARTER_ITEMS,
      isOn: true,
    });
    const before = view.starters;
    const beforeExtensions = prompt.extensions;
    const editor = prompt.getEditor();
    await rerender({ items: STARTER_ITEMS, isOn: true });
    expect(view.starters).toBe(before);
    expect(prompt.extensions).toBe(beforeExtensions);
    expect(prompt.getEditor()).toBe(editor);
  });

  it('recomputes when only disableDirectSend changes', async () => {
    const { view, rerender } = await renderStarters({
      items: STARTER_ITEMS,
      disableDirectSend: false,
    });
    expect(view.starters.disableDirectSend).toBe(false);
    await rerender({ items: STARTER_ITEMS, disableDirectSend: true });
    expect(view.starters.disableDirectSend).toBe(true);
  });
});

it('preserves committed extension identity after a suspended transition is abandoned', async () => {
  const initial: TriggerSuggestionConfig = { trigger: '@', items: [] };
  const suspended: TriggerSuggestionConfig = { trigger: '#', items: [] };
  const { owner, props, mount, ready } = await fixture({ mention: initial });
  const pending = new Promise<void>(() => {});
  let changeMention: (mention: TriggerSuggestionConfig) => void;
  let refresh: () => void;
  let suspendedRenderCount = 0;

  function SuspendForMention({
    mention,
  }: {
    mention: TriggerSuggestionConfig;
  }): null {
    if (mention === suspended) {
      suspendedRenderCount += 1;
      throw pending;
    }
    return null;
  }

  function Harness(): React.ReactElement {
    const [mention, setMention] = useState(initial);
    const [, setRevision] = useState(0);
    changeMention = setMention;
    refresh = () => setRevision((revision) => revision + 1);
    return (
      <InputConfigContext.Provider value={{ mention }}>
        <NativeInputConfigHarness {...props} contentOwner={owner} />
        <SuspendForMention mention={mention} />
      </InputConfigContext.Provider>
    );
  }

  mount(
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
  const { view, prompt } = await ready();
  const before = prompt.extensions;
  const beforeMention = view.mention;
  const editor = prompt.getEditor();
  await act(async () => {
    startTransition(() => changeMention(suspended));
  });
  expect(suspendedRenderCount).toBeGreaterThan(0);
  expect(
    jest
      .mocked(useInputConfig)
      .mock.results.some(
        (result) =>
          result.type === 'return' && result.value.mention === suspended
      )
  ).toBe(true);
  expect(view.mention).toBe(beforeMention);
  expect(prompt.extensions).toBe(before);
  act(() => {
    changeMention(initial);
    refresh();
  });
  await act(async () => {
    await flush(view);
  });
  expect(view.mention).toBe(beforeMention);
  expect(prompt.extensions).toBe(before);
  expect(prompt.getEditor()).toBe(editor);
});

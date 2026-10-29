/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { LitElement, ReactiveElement, nothing } from 'lit';
import { waitFor } from '@testing-library/react';
import { Mark, type Extension, type JSONContent } from '@tiptap/core';
import PromptLine from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import '../../../src/chat/components/input/ChatInput';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { InputFunctions } from '../../../src/chat/utils/inputTypes';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import * as miscUtils from '../../../src/chat/utils/miscUtils';
import actions from '../../../src/chat/store/actions';
import { selectInputState } from '../../../src/chat/store/selectors';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import {
  makeConfigStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

class DraftProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-custom-prompt-draft-provider', DraftProvider);

const states = new Set<ChatViewState>();
const owners = new Set<AutocompleteContent>();
const draftStores = new WeakMap<
  ChatInput,
  ReturnType<typeof makeConfigStore>
>();
const originalReady = Object.getOwnPropertyDescriptor(
  ReactiveElement.prototype,
  'updateComplete'
).get;
const originalEnsureEditor = PromptLine.prototype.ensureEditor;
const bold = Mark.create({
  name: 'bold',
  parseHTML: () => [{ tag: 'strong' }],
  renderHTML: () => ['strong', 0],
}) as unknown as Extension;
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
let upgrade: Promise<void>;
let ensureEditor: jest.SpyInstance;
let setContent: jest.SpyInstance;
let restoreErrors: jest.SpyInstance;

function deferred<Value>() {
  let resolve: (value: Value) => void;
  const promise = new Promise<Value>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve: (value: Value) => resolve(value) };
}

async function flush(view: ChatInput) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    const prompt = view.querySelector<PromptLine>('cds-aichat-prompt-line');
    if (prompt) {
      await originalReady.call(prompt);
    }
  }
}

async function setup(
  content: JSONContent = plain,
  visible = true,
  restoreDraft = true
) {
  const store = makeConfigStore({});
  store.dispatch(
    actions.updateInputState({ rawValue: 'parked draft', content }, false)
  );
  let inputFunctions: InputFunctions | null = null;
  const wrapper = document.createElement('div');
  const serviceManager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred: jest.fn() },
    writeableElements: { [WriteableElementName.CUSTOM_PROMPT_LINE]: wrapper },
    instance: {
      writeableElements: { [WriteableElementName.CUSTOM_PROMPT_LINE]: wrapper },
    },
    setInputFunctionsRef: jest.fn((value) => {
      inputFunctions = value;
    }),
    getInputFunctionsRef: () => inputFunctions,
  } as unknown as ServiceManager;
  const state = new ChatViewState(serviceManager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-custom-prompt-draft-provider'
  ) as DraftProvider;
  provider.provider.setValue(state);
  document.body.append(provider);
  await provider.updateComplete;
  const owner = new AutocompleteContent(provider);
  owner.connect();
  owners.add(owner);
  const view = document.createElement('cds-aichat-chat-input');
  const onSendInput = jest.fn();
  let displayContent: JSONContent;
  view.addEventListener(
    'cds-aichat-prompt-change',
    (event: CustomEvent<{ content?: JSONContent }>) => {
      displayContent = event.detail.content;
    }
  );
  view.inputProps = {
    disableInput: false,
    disableSend: false,
    isInputVisible: visible,
    trackInputState: true,
    restoreDraft,
    onSendInput,
    onStopStreaming: async () => {},
  };
  view.contentOwner = owner;
  draftStores.set(view, store);
  provider.shadowRoot.append(view);
  await flush(view);
  return {
    view,
    store,
    serviceManager,
    wrapper,
    onSendInput,
    displayContent: () => displayContent,
    prompt: () => view.querySelector<PromptLine>('cds-aichat-prompt-line'),
    setVisible: async (next: boolean) => {
      view.inputProps = { ...view.inputProps, isInputVisible: next };
      await flush(view);
    },
    unmount: async () => {
      view.remove();
      await Promise.resolve();
    },
  };
}

async function expectDraft(
  fixture: Awaited<ReturnType<typeof setup>>,
  text: string
) {
  await fixture.view.ready;
  expect(fixture.serviceManager.actions.errorOccurred).not.toHaveBeenCalled();
  expect(restoreErrors).not.toHaveBeenCalled();
  await waitFor(() => {
    const prompt = fixture.prompt();
    expect(prompt.getValue()).toBe(text);
    const editor = prompt.getEditor();
    if (editor) {
      expect(editor.view.dom.textContent).toBe(text);
    } else {
      expect(prompt.querySelector('textarea')).toHaveValue(text);
    }
  });
}

function send(prompt: PromptLine) {
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-send-intent', {
      bubbles: true,
      composed: true,
    })
  );
}

describe('custom prompt line draft restoration', () => {
  beforeEach(() => {
    setupBeforeEach();
    ready = Promise.resolve(true);
    upgrade = Promise.resolve();
    jest
      .spyOn(PromptLine.prototype, 'updateComplete', 'get')
      .mockImplementation(function (this: PromptLine) {
        const updated = originalReady.call(this) as Promise<boolean>;
        return ready.then(() => updated);
      });
    ensureEditor = jest
      .spyOn(PromptLine.prototype, 'ensureEditor')
      .mockImplementation(function (this: PromptLine) {
        return upgrade.then(async () => {
          // Configure the fixture mark through its owner only after the lazy upgrade gate.
          const view = this.closest<ChatInput>('cds-aichat-chat-input');
          const store = draftStores.get(view);
          const config = store.getState().config;
          const extensions = config.public.input?.tiptap?.extensions ?? [];
          if (!extensions.includes(bold)) {
            store.dispatch(
              actions.changeState({
                config: {
                  ...config,
                  public: {
                    ...config.public,
                    input: {
                      ...config.public.input,
                      tiptap: {
                        ...config.public.input?.tiptap,
                        extensions: [...extensions, bold],
                      },
                    },
                  },
                },
              })
            );
          }
          await flush(view);
          await this.updateComplete;
          return originalEnsureEditor.call(this);
        });
      });
    setContent = jest.spyOn(PromptLine.prototype, 'setContent');
    restoreErrors = jest.spyOn(miscUtils, 'consoleError');
  });
  afterEach(async () => {
    document.body.replaceChildren();
    await Promise.resolve();
    owners.forEach((owner) => owner.disconnect());
    owners.clear();
    states.forEach((state) => state.disconnect());
    states.clear();
    expect(restoreErrors).not.toHaveBeenCalled();
    jest.restoreAllMocks();
    setupAfterEach();
  });

  it('restores visible plain text after the surface is ready without loading an editor', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const fixture = await setup();
    expect(setContent).not.toHaveBeenCalled();
    gate.resolve(true);
    await expectDraft(fixture, 'parked draft');
    expect(ensureEditor).not.toHaveBeenCalled();
    expect(fixture.prompt().getEditor()).toBeNull();
  });

  it('restores the rich document and sends its display content', async () => {
    const fixture = await setup(rich);
    await expectDraft(fixture, 'parked draft');
    expect(ensureEditor).toHaveBeenCalledTimes(1);
    expect(setContent).toHaveBeenCalledWith(rich);
    const displayed = fixture.displayContent();
    expect(displayed).toEqual(rich);
    expect(selectInputState(fixture.store.getState()).content).toEqual(rich);
    send(fixture.prompt());
    expect(fixture.onSendInput).toHaveBeenCalledWith('parked draft', rich);
    expect(fixture.onSendInput.mock.calls[0][1]).toBe(displayed);
  });

  it('keeps restoration pending while the fallback is hidden', async () => {
    const fixture = await setup(rich, false);
    expect(fixture.prompt()).toBeNull();
    expect(setContent).not.toHaveBeenCalled();
    await fixture.setVisible(true);
    await expectDraft(fixture, 'parked draft');
    expect(setContent).toHaveBeenCalledWith(rich);
  });

  it('restores again when visibility remounts the built-in surface', async () => {
    const fixture = await setup();
    await expectDraft(fixture, 'parked draft');
    const original = fixture.prompt();
    await fixture.setVisible(false);
    expect(fixture.prompt()).toBeNull();
    await fixture.setVisible(true);
    await expectDraft(fixture, 'parked draft');
    expect(fixture.prompt()).not.toBe(original);
  });

  it('cancels restoration when the input unmounts before readiness', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const fixture = await setup();
    await fixture.unmount();
    gate.resolve(true);
    await flush(fixture.view);
    expect(setContent).not.toHaveBeenCalled();
    expect(fixture.serviceManager.getInputFunctionsRef()).toBeNull();
  });

  it('leaves normal first mounts unchanged', async () => {
    const fixture = await setup(plain, true, false);
    await expectDraft(fixture, '');
    expect(setContent).not.toHaveBeenCalled();
    expect(ensureEditor).not.toHaveBeenCalled();
  });

  it('reads the current draft after readiness, including a cleared parked draft', async () => {
    const gate = deferred<boolean>();
    ready = gate.promise;
    const fixture = await setup(rich);
    fixture.store.dispatch(
      actions.updateInputState(
        { rawValue: '', content: { type: 'doc', content: [] } },
        false
      )
    );
    setContent.mockClear();
    gate.resolve(true);
    await expectDraft(fixture, '');
    expect(setContent).toHaveBeenLastCalledWith('');
    expect(ensureEditor).not.toHaveBeenCalled();
  });

  it('does not overwrite newer typing while the rich editor loads', async () => {
    const gate = deferred<void>();
    upgrade = gate.promise;
    const fixture = await setup(rich);
    await waitFor(() => expect(ensureEditor).toHaveBeenCalled());
    fixture.prompt().dispatchEvent(
      new CustomEvent('cds-aichat-prompt-change', {
        detail: { rawValue: 'new draft', content: plain },
        bubbles: true,
        composed: true,
      })
    );
    gate.resolve();
    await fixture.view.ready;
    expect(setContent).not.toHaveBeenCalledWith(rich);
    expect(selectInputState(fixture.store.getState()).rawValue).toBe(
      'new draft'
    );
  });

  it('cancels a restore when custom content returns during the upgrade', async () => {
    const gate = deferred<void>();
    upgrade = gate.promise;
    const fixture = await setup(rich);
    await waitFor(() => expect(ensureEditor).toHaveBeenCalled());
    fixture.wrapper.appendChild(document.createElement('input'));
    gate.resolve();
    await fixture.view.ready;
    expect(setContent).not.toHaveBeenCalled();
    expect(selectInputState(fixture.store.getState()).content).toBe(rich);
  });

  it.each(['surface readiness', 'editor upgrade'])(
    'restores the current human-agent draft after switching during %s',
    async (phase) => {
      const readyGate = deferred<boolean>();
      const upgradeGate = deferred<void>();
      if (phase === 'surface readiness') {
        ready = readyGate.promise;
      } else {
        upgrade = upgradeGate.promise;
      }
      const fixture = await setup(rich);
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
      fixture.store.dispatch(
        actions.updateInputState(
          { rawValue: 'agent draft', content: agentDraft },
          true
        )
      );
      fixture.store.dispatch(
        actions.changeState({
          persistedToBrowserStorage: {
            humanAgentState: { isConnected: true },
          },
        })
      );
      readyGate.resolve(true);
      upgradeGate.resolve();
      await flush(fixture.view);
      await expectDraft(fixture, 'agent draft');
      expect(setContent).not.toHaveBeenCalledWith(rich);
      const displayed = fixture.displayContent();
      expect(displayed).toEqual(agentDraft);
      expect(selectInputState(fixture.store.getState()).content).toEqual(
        agentDraft
      );
      expect(fixture.store.getState().assistantInputState.content).toEqual(
        rich
      );
      send(fixture.prompt());
      expect(fixture.onSendInput).toHaveBeenCalledWith(
        'agent draft',
        agentDraft
      );
      expect(fixture.onSendInput.mock.calls[0][1]).toBe(displayed);
    }
  );

  it('clears built-in focus on unmount without clearing a newer handle', async () => {
    const fixture = await setup();
    await expectDraft(fixture, 'parked draft');
    fixture.store.dispatch(actions.updateInputState({ focused: true }, false));
    const replacement = {} as InputFunctions;
    fixture.serviceManager.setInputFunctionsRef(replacement);
    await fixture.unmount();
    expect(selectInputState(fixture.store.getState()).focused).toBe(false);
    expect(fixture.serviceManager.getInputFunctionsRef()).toBe(replacement);
  });
});

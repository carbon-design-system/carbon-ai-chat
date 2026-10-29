/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import {
  Node as TiptapNode,
  type Extension,
  type JSONContent,
} from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type InputSendControl from '@carbon/ai-chat-components/es/components/prompt-line/src/send-control.js';
import type ErrorMessage from '@carbon/ai-chat-components/es/components/prompt-line/src/error-message.js';
import type FileUploads from '@carbon/ai-chat-components/es/components/file-uploads/src/file-uploads.js';
import { FileStatusValue } from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';
import '../../../src/chat/components/input/ChatInput';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import type NativeAutocomplete from '../../../src/chat/components/input/NativeAutocomplete';
import type {
  InputFunctions,
  InputProps,
} from '../../../src/chat/utils/inputTypes';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { selectInputState } from '../../../src/chat/store/selectors';
import * as draftUtils from '../../../src/chat/utils/restoreInputDraft';
import * as miscUtils from '../../../src/chat/utils/miscUtils';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class InputProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-input-provider', InputProvider);
const states = new Set<ChatViewState>();
const owners = new Set<AutocompleteContent>();

function deferred<Value>() {
  let resolve: (value: Value) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<Value>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function flush(view: ChatInput) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    await view.querySelector<PromptLineElement>('cds-aichat-prompt-line')
      ?.updateComplete;
    await view.querySelector<FileUploads>('cds-aichat-file-uploads')
      ?.updateComplete;
  }
}

async function fixture(
  overrides: Partial<InputProps> = {},
  prepare?: (store: ReturnType<typeof makeConfigStore>) => void,
  assignPropsAfterConnect = false
) {
  const store = makeConfigStore({});
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
  const announce = jest.spyOn(state.announcer, 'announce');
  const provider = document.createElement(
    'test-native-input-provider'
  ) as InputProvider;
  provider.provider.setValue(state);
  document.body.append(provider);
  await provider.updateComplete;
  const owner = new AutocompleteContent(provider);
  owner.connect();
  owners.add(owner);
  const view = document.createElement('cds-aichat-chat-input');
  const onSendInput = jest.fn();
  const inputProps: InputProps = {
    disableInput: false,
    isInputVisible: true,
    disableSend: false,
    onSendInput,
    onStopStreaming: async () => {},
    ...overrides,
  };
  if (!assignPropsAfterConnect) {
    view.inputProps = inputProps;
  }
  view.contentOwner = owner;
  provider.shadowRoot.append(view);
  if (assignPropsAfterConnect) {
    view.inputProps = inputProps;
  }
  await flush(view);
  await view.ready;
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  const control = view.querySelector<InputSendControl>(
    'cds-aichat-input-send-control'
  );
  return {
    view,
    provider,
    prompt,
    control,
    store,
    state,
    manager,
    announce,
    errorOccurred,
    onSendInput,
  };
}

function change(
  prompt: PromptLineElement,
  rawValue: string,
  content?: JSONContent
) {
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-change', {
      detail: { rawValue, content },
      bubbles: true,
      composed: true,
    })
  );
}
function send(control: InputSendControl) {
  control.dispatchEvent(new CustomEvent('cds-aichat-input-send'));
}
function update(view: ChatInput, props: Partial<InputProps>) {
  view.inputProps = { ...view.inputProps, ...props };
  return flush(view);
}

beforeEach(setupBeforeEach);
afterEach(() => {
  document.body.replaceChildren();
  owners.forEach((owner) => owner.disconnect());
  owners.clear();
  states.forEach((state) => state.disconnect());
  states.clear();
  setupAfterEach();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('owns the input slot and keeps all shell targets directly slotted', async () => {
  const { view, store } = await fixture({ showUploadButton: true });
  const shell = view.querySelector('cds-aichat-prompt-line-shell');
  expect(view.slot).toBe('input');
  expect(view.style.display).toBe('block');
  expect(view.shadowRoot).toBeNull();
  expect(shell.getAttribute('exportparts')).toBe('prompt-container');
  expect(
    view.querySelector('cds-aichat-native-autocomplete').parentElement
  ).toBe(shell);
  expect(view.querySelector('cds-aichat-file-uploads').parentElement).toBe(
    shell
  );
  const sendStart = view.querySelector('cds-aichat-prompt-line-slot');
  expect(sendStart.parentElement).toBe(shell);
  expect(sendStart.nextElementSibling.tagName.toLowerCase()).toBe(
    'cds-aichat-input-send-control'
  );
  applyConfigChange(store, { input: { expanded: true } });
  await flush(view);
  const actionsEnd = shell.querySelector(
    'cds-aichat-prompt-line-slot[slot="message-actions"]'
  );
  expect(actionsEnd.previousElementSibling.getAttribute('slot')).toBe(
    'message-actions'
  );
  expect(actionsEnd.hasAttribute('data-prompt-line-slot')).toBe(true);
});

it('sends the trimmed value and the identical document before clearing the live surface and tracked slice', async () => {
  const { view, prompt, control, store, onSendInput } = await fixture({
    trackInputState: true,
  });
  const content = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '  hello  ' }] },
    ],
  };
  const order: string[] = [];
  const clear = jest.spyOn(prompt, 'clearContent').mockImplementation(() => {
    order.push('clear');
  });
  const history = jest.spyOn(prompt, 'resetHistory').mockImplementation(() => {
    order.push('history');
  });
  change(prompt, '  hello  ', content);
  onSendInput.mockImplementation((text, document) => {
    order.push('send');
    expect(text).toBe('hello');
    expect(document).toBe(content);
    expect(selectInputState(store.getState()).rawValue).toBe('  hello  ');
  });
  send(control);
  expect(order).toEqual(['send', 'clear', 'history']);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(history).toHaveBeenCalledTimes(1);
  expect(selectInputState(store.getState()).rawValue).toBe('');
  await flush(view);
  expect(control.hasValidInput).toBe(false);
});

it('uses the same value guard for Enter, configured errors, lengths and transferring files', async () => {
  const { view, prompt, control, onSendInput, store } = await fixture({
    maxInputChars: 3,
  });
  change(prompt, '    ');
  send(control);
  change(prompt, 'long');
  await flush(view);
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-send-intent', { bubbles: true })
  );
  expect(onSendInput).not.toHaveBeenCalled();
  change(prompt, 'ok');
  await update(view, { error: { title: 'Blocked' } });
  send(control);
  await update(view, {
    error: undefined,
    pendingUploads: [
      {
        id: 'upload',
        status: FileStatusValue.UPLOADING,
        file: new File(['upload'], 'upload.txt'),
      },
    ],
  });
  send(control);
  await update(view, { pendingUploads: [] });
  applyConfigChange(store, { input: { isSendDisabled: true } });
  await flush(view);
  send(control);
  expect(control.disableSend).toBe(true);
  expect(onSendInput).not.toHaveBeenCalled();
  applyConfigChange(store, {});
  await flush(view);
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-send-intent', { bubbles: true })
  );
  expect(onSendInput).toHaveBeenCalledWith('ok', undefined);
});

it('retains one handle across visibility changes and makes old handles inert after reconnect', async () => {
  const { view, provider, prompt, manager } = await fixture();
  const handle = view.inputFunctions;
  expect(manager.getInputFunctionsRef()).toBe(handle);
  const set = jest.spyOn(prompt, 'setContent');
  handle.setContent('draft');
  expect(set).toHaveBeenCalledWith('draft');
  expect(handle.getEditor()).toBeNull();
  await update(view, { isInputVisible: false });
  expect(view.inputFunctions).toBe(handle);
  expect(view.querySelector('cds-aichat-prompt-line-shell')).toBeNull();
  expect(handle.requestFocus()).toBe(false);
  expect(() => handle.setContent('hidden')).toThrow(
    'Input is not currently rendered'
  );
  await update(view, { isInputVisible: true });
  expect(view.inputFunctions).toBe(handle);
  view.remove();
  await Promise.resolve();
  expect(manager.getInputFunctionsRef()).toBeNull();
  provider.shadowRoot.append(view);
  await flush(view);
  expect(view.inputFunctions).not.toBe(handle);
  expect(handle.getEditor()).toBeNull();
  expect(handle.requestFocus()).toBe(false);
  expect(() => handle.insertContent('stale')).toThrow(
    'Input is not currently rendered'
  );
});

it('keeps the prompt, editor, selection, handle and local draft through same-task moves', async () => {
  const { view, provider, prompt, onSendInput } = await fixture();
  const handle = view.inputFunctions;
  const editor = await handle.ensureEditor();
  handle.setContent('moving draft');
  await flush(view);
  editor.commands.setTextSelection(4);
  view.remove();
  provider.shadowRoot.append(view);
  await flush(view);
  expect(view.inputFunctions).toBe(handle);
  expect(view.querySelector('cds-aichat-prompt-line')).toBe(prompt);
  expect(handle.getEditor()).toBe(editor);
  expect(editor.state.selection.from).toBe(4);
  const target = document.createElement('div');
  provider.shadowRoot.append(target);
  target.appendChild(view);
  await flush(view);
  expect(view.querySelector('cds-aichat-prompt-line')).toBe(prompt);
  expect(handle.getEditor()).toBe(editor);
  expect(editor.state.selection.from).toBe(4);
  send(view.querySelector<InputSendControl>('cds-aichat-input-send-control'));
  expect(onSendInput).toHaveBeenCalledWith('moving draft', expect.any(Object));
});

it('preserves rendered guard snapshots while autocomplete synchronously seeds a longer value', async () => {
  const { view, prompt, onSendInput } = await fixture({ maxInputChars: 3 });
  change(prompt, 'ok');
  await flush(view);
  const autocomplete = view.querySelector<NativeAutocomplete>(
    'cds-aichat-native-autocomplete'
  );
  autocomplete.onSendItem('a long selected value');
  expect(onSendInput).toHaveBeenCalledWith('a long selected value', undefined);
  await flush(view);
  change(prompt, 'already over the limit');
  await flush(view);
  autocomplete.onStarterSelected('ok');
  expect(onSendInput).toHaveBeenCalledTimes(1);
});

it('restores tracked drafts for each replacement surface and active agent slice', async () => {
  const { view, prompt, store } = await fixture(
    { trackInputState: true, restoreDraft: true },
    (store) => {
      store.dispatch(
        actions.updateInputState({ rawValue: 'assistant draft' }, false)
      );
      store.dispatch(
        actions.updateInputState({ rawValue: 'agent draft' }, true)
      );
    }
  );
  expect(prompt.getValue()).toBe('assistant draft');
  store.dispatch(
    actions.changeState({
      humanAgentState: {
        ...store.getState().humanAgentState,
        isConnecting: true,
      },
    })
  );
  await flush(view);
  await view.ready;
  expect(prompt.getValue()).toBe('agent draft');
  await update(view, { isInputVisible: false });
  await update(view, { isInputVisible: true });
  await view.ready;
  const replacement = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  expect(replacement).not.toBe(prompt);
  expect(replacement.getValue()).toBe('agent draft');
});

it('keeps the lazy editor and extension objects through typing, hidden input and unrelated config updates', async () => {
  const { view, prompt, store } = await fixture();
  expect(view.inputFunctions.getEditor()).toBeNull();
  const editor = await view.inputFunctions.ensureEditor();
  await flush(view);
  const extensions = prompt.extensions;
  const editorExtensions = editor.extensionManager.extensions;
  const nodeViews = editor.view.props.nodeViews;
  change(prompt, 'typed');
  applyConfigChange(store, { header: { title: 'Unrelated title' } });
  await flush(view);
  expect(view.inputFunctions.getEditor()).toBe(editor);
  expect(prompt.extensions).toBe(extensions);
  expect(editor.extensionManager.extensions).toBe(editorExtensions);
  expect(editor.view.props.nodeViews).toBe(nodeViews);
  await update(view, { isInputVisible: false });
  await update(view, { isInputVisible: true });
  const replacement = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  expect(replacement.rich).toBe(true);
});

it('clears the native file input before validation, accepts EDIT files once and announces rejections assertively', async () => {
  const selected = jest.fn();
  const { view, announce } = await fixture({
    showUploadButton: true,
    allowedFileUploadTypes: '.txt',
    onFilesSelectedForUpload: selected,
  });
  const input = view.querySelector<HTMLInputElement>('input[type="file"]');
  Object.defineProperty(input, 'value', { value: 'same file', writable: true });
  const accepted = new File(['ok'], 'accepted.txt', { type: 'text/plain' });
  const rejected = new File(['bad'], 'rejected.png', { type: 'image/png' });
  Object.defineProperty(input, 'files', {
    value: [accepted, rejected],
    configurable: true,
  });
  selected.mockImplementation((files) => {
    expect(input.value).toBe('');
    expect(files).toEqual([
      { id: expect.any(String), status: FileStatusValue.EDIT, file: accepted },
    ]);
  });
  input.dispatchEvent(new Event('change'));
  input.dispatchEvent(new Event('change'));
  expect(selected).toHaveBeenCalledTimes(2);
  expect(announce).toHaveBeenCalledWith(
    expect.objectContaining({ assertive: true })
  );
  const uploads = view.querySelector<FileUploads>('cds-aichat-file-uploads');
  expect(uploads.uploads).toEqual([]);
  expect(
    uploads.shadowRoot.querySelectorAll('[aria-live="polite"]')
  ).toHaveLength(2);
  expect(
    uploads.shadowRoot.querySelectorAll('[aria-live="assertive"]')
  ).toHaveLength(2);
  await update(view, {
    pendingUploads: [
      { id: 'one', status: FileStatusValue.EDIT, file: accepted },
    ],
  });
  await update(view, { pendingUploads: [] });
  expect(view.querySelector('cds-aichat-file-uploads')).toBe(uploads);
});

it('wires remove and agent typing once and ignores events from replaced surfaces', async () => {
  const onRemoveFile = jest.fn();
  const onUserTyping = jest.fn();
  const { view, prompt } = await fixture({
    showUploadButton: true,
    onRemoveFile,
    onUserTyping,
  });
  const uploads = view.querySelector('cds-aichat-file-uploads');
  uploads.dispatchEvent(
    new CustomEvent('cds-aichat-file-remove', { detail: { fileId: 'one' } })
  );
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-typing', { detail: { isTyping: true } })
  );
  expect(onRemoveFile.mock.calls).toEqual([['one']]);
  expect(onUserTyping.mock.calls).toEqual([[true]]);
  await update(view, { isInputVisible: false });
  await update(view, { isInputVisible: true });
  uploads.dispatchEvent(
    new CustomEvent('cds-aichat-file-remove', { detail: { fileId: 'stale' } })
  );
  prompt.dispatchEvent(
    new CustomEvent('cds-aichat-prompt-typing', { detail: { isTyping: false } })
  );
  expect(onRemoveFile).toHaveBeenCalledTimes(1);
  expect(onUserTyping).toHaveBeenCalledTimes(1);
});

it('passes Stop its pending callback and clears local pending after settlement', async () => {
  const pending = deferred<void>();
  const callback = jest.fn((markPending: () => void) => {
    markPending();
    return pending.promise;
  });
  const { view, control } = await fixture({
    onStopStreaming: callback,
    isStopStreamingButtonVisible: true,
  });
  control.dispatchEvent(new CustomEvent('cds-aichat-input-stop-streaming'));
  await flush(view);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(control.isStopStreamingButtonDisabled).toBe(true);
  pending.resolve();
  await flush(view);
  expect(control.isStopStreamingButtonDisabled).toBe(false);
});

it('keeps configured errors live beside failed chips and retains a continuous single error', async () => {
  const upload = {
    id: 'failed',
    status: FileStatusValue.EDIT,
    isError: true,
    file: new File(['failed'], 'failed.txt'),
  };
  const { view, announce, prompt } = await fixture({
    pendingUploads: [upload],
    maxInputChars: 3,
  });
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  await update(view, {
    error: {
      title: 'Configured error',
      description: 'Configured detail',
      collapsible: true,
    },
  });
  jest.runOnlyPendingTimers();
  const error = view.querySelector<ErrorMessage>('cds-aichat-error-message');
  const live = error.parentElement;
  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(announce.mock.calls).toEqual([
    ['Configured error. Configured detail'],
  ]);
  change(prompt, 'too long');
  await flush(view);
  jest.runOnlyPendingTimers();
  expect(view.querySelector('cds-aichat-error-message')).toBe(error);
  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(announce).toHaveBeenCalledTimes(1);
  change(prompt, 'longer still');
  await flush(view);
  jest.runOnlyPendingTimers();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(view.querySelector('cds-aichat-error-message')).toBe(error);
  change(prompt, 'ok');
  await update(view, { error: undefined, pendingUploads: [] });
  expect(view.querySelector('cds-aichat-error-message')).toBeNull();
  await update(view, { error: { title: 'New error' } });
  jest.runOnlyPendingTimers();
  expect(view.querySelector('cds-aichat-error-message')).not.toBeNull();
  expect(view.querySelector('cds-aichat-error-message')).not.toBe(error);
  expect(announce).toHaveBeenCalledTimes(2);
});

it('keeps upload rows keyed and silent between max-length and configured errors', async () => {
  const { view, prompt, control, announce, onSendInput } = await fixture({
    maxInputChars: 3,
  });
  const uploadErrors: InputProps['uploadErrors'] = [
    {
      id: 'apple',
      filename: 'Apple.txt',
      title: 'File upload error: Apple.txt',
      description: 'Apple failed. Remove the attachment and try again.',
    },
    {
      id: 'zebra',
      filename: 'zebra.txt',
      title: 'File upload error: zebra.txt',
      description: 'Zebra failed. Remove the attachment and try again.',
    },
  ];
  const rows = () =>
    Array.from(
      view.querySelectorAll<ErrorMessage>(
        '[slot="field-messaging"] cds-aichat-error-message'
      )
    );
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  change(prompt, 'ok');
  await update(view, { uploadErrors });
  jest.runOnlyPendingTimers();
  const [apple, zebra] = rows();
  expect(rows().map((row) => row.title)).toEqual(
    uploadErrors.map((entry) => entry.title)
  );
  expect(rows().map((row) => row.description)).toEqual(
    uploadErrors.map((entry) => entry.description)
  );
  expect(rows().every((row) => row.collapsible === false)).toBe(true);
  expect(
    rows().map((row) => row.parentElement.getAttribute('aria-live'))
  ).toEqual(['off', 'off']);
  expect(
    view.querySelector('cds-aichat-prompt-line-shell').hasAttribute('has-error')
  ).toBe(true);
  expect(control.disableSend).toBe(true);
  send(control);
  expect(onSendInput).not.toHaveBeenCalled();
  expect(announce).not.toHaveBeenCalled();

  await update(view, {
    error: { title: 'Configured error', description: 'Configured detail' },
    uploadErrors: [
      uploadErrors[1],
      { ...uploadErrors[0], description: 'Updated Apple reason.' },
    ],
  });
  jest.runOnlyPendingTimers();
  expect(rows()[0]).toBe(zebra);
  expect(rows()[1]).toBe(apple);
  expect(apple.description).toBe('Updated Apple reason.');
  expect(announce).not.toHaveBeenCalled();

  change(prompt, 'too long');
  await flush(view);
  jest.runOnlyPendingTimers();
  expect(rows()).toHaveLength(1);
  expect(rows()[0].title).toBe('Error: Max character count exceeded');
  expect(rows()[0].parentElement.getAttribute('aria-live')).toBe('polite');
  expect(announce).toHaveBeenCalledTimes(1);

  change(prompt, 'ok');
  await flush(view);
  jest.runOnlyPendingTimers();
  expect(rows().map((row) => row.title)).toEqual([
    uploadErrors[1].title,
    uploadErrors[0].title,
  ]);
  expect(
    rows().map((row) => row.parentElement.getAttribute('aria-live'))
  ).toEqual(['off', 'off']);
  expect(announce).toHaveBeenCalledTimes(1);

  await update(view, {
    uploadErrors: [],
    pendingUploads: [
      {
        id: 'failed',
        status: FileStatusValue.EDIT,
        isError: true,
        file: new File(['failed'], 'failed.txt'),
      },
    ],
  });
  jest.runOnlyPendingTimers();
  expect(rows()).toHaveLength(1);
  expect(rows()[0].title).toBe('Configured error');
  expect(rows()[0].parentElement.getAttribute('aria-live')).toBe('polite');
  expect(announce).toHaveBeenCalledTimes(2);
  expect(announce).toHaveBeenLastCalledWith(
    'Configured error. Configured detail'
  );
});

it('discards stale autocomplete sends and old Stop completion after reconnect', async () => {
  const pending = deferred<void>();
  let markPending: () => void;
  const { view, provider, control, onSendInput } = await fixture({
    onStopStreaming: (mark) => {
      markPending = mark;
      return pending.promise;
    },
  });
  const autocomplete = view.querySelector<NativeAutocomplete>(
    'cds-aichat-native-autocomplete'
  );
  const oldSend = autocomplete.onSendItem;
  control.dispatchEvent(new CustomEvent('cds-aichat-input-stop-streaming'));
  view.remove();
  await Promise.resolve();
  provider.shadowRoot.append(view);
  await flush(view);
  oldSend('stale');
  markPending();
  pending.resolve();
  await flush(view);
  expect(onSendInput).not.toHaveBeenCalled();
  expect(
    view.querySelector<InputSendControl>('cds-aichat-input-send-control')
      .isStopStreamingButtonDisabled
  ).toBe(false);
});

it('forgets autocomplete navigation when its surface unmounts', async () => {
  const { view, onSendInput } = await fixture();
  const autocomplete = view.querySelector<NativeAutocomplete>(
    'cds-aichat-native-autocomplete'
  );
  autocomplete.onListNavigated(true);
  await flush(view);
  expect(
    view.querySelector<InputSendControl>('cds-aichat-input-send-control')
      .disableSend
  ).toBe(true);
  await update(view, { isInputVisible: false });
  await update(view, { isInputVisible: true });
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  const control = view.querySelector<InputSendControl>(
    'cds-aichat-input-send-control'
  );
  change(prompt, 'ordinary text');
  await flush(view);
  expect(control.disableSend).toBe(false);
  expect(control.hasValidInput).toBe(true);
  send(control);
  expect(onSendInput).toHaveBeenCalledWith('ordinary text', undefined);
});

it('ignores old prompt, file-select and remove events immediately after a retired owner reconnects', async () => {
  const selected = jest.fn();
  const removed = jest.fn();
  const { view, provider, prompt, store } = await fixture({
    trackInputState: true,
    showUploadButton: true,
    onFilesSelectedForUpload: selected,
    onRemoveFile: removed,
  });
  const input = view.querySelector<HTMLInputElement>('input[type="file"]');
  const uploads = view.querySelector('cds-aichat-file-uploads');
  Object.defineProperty(input, 'files', {
    value: [new File(['old'], 'old.txt')],
  });
  view.remove();
  await Promise.resolve();
  provider.shadowRoot.append(view);
  change(prompt, 'old owner');
  input.dispatchEvent(new Event('change'));
  uploads.dispatchEvent(
    new CustomEvent('cds-aichat-file-remove', {
      detail: { fileId: 'old owner' },
    })
  );
  expect(selectInputState(store.getState()).rawValue).toBe('');
  expect(selected).not.toHaveBeenCalled();
  expect(removed).not.toHaveBeenCalled();
  await flush(view);
  expect(view.querySelector('cds-aichat-prompt-line')).not.toBe(prompt);
});

it('keeps automatic draft restoration failures console-only across a same-task move', async () => {
  const { view, provider, errorOccurred } = await fixture();
  const pending = deferred<boolean>();
  const restore = jest
    .spyOn(draftUtils, 'restoreInputDraft')
    .mockReturnValue(pending.promise);
  const log = jest
    .spyOn(miscUtils, 'consoleError')
    .mockImplementation(() => {});
  await update(view, { trackInputState: true, restoreDraft: true });
  const prompt = view.querySelector('cds-aichat-prompt-line');
  const destination = document.createElement('div');
  provider.shadowRoot.append(destination);
  destination.appendChild(view);
  await flush(view);
  const failure = new Error('draft restoration failed');
  pending.reject(failure);
  await view.ready;
  expect(view.querySelector('cds-aichat-prompt-line')).toBe(prompt);
  expect(restore).toHaveBeenCalledTimes(1);
  expect(log.mock.calls).toEqual([
    ['Unable to restore the built-in input draft.', failure],
  ]);
  expect(errorOccurred).not.toHaveBeenCalled();
});

it('does not log automatic draft failures after their owner retires', async () => {
  const { view, errorOccurred } = await fixture();
  const pending = deferred<boolean>();
  jest.spyOn(draftUtils, 'restoreInputDraft').mockReturnValue(pending.promise);
  const log = jest
    .spyOn(miscUtils, 'consoleError')
    .mockImplementation(() => {});
  await update(view, { trackInputState: true, restoreDraft: true });
  view.remove();
  await Promise.resolve();
  pending.reject(new Error('retired draft restoration failed'));
  await pending.promise.catch(() => {});
  await Promise.resolve();
  expect(log).not.toHaveBeenCalled();
  expect(errorOccurred).not.toHaveBeenCalled();
});

it('sends a staged file without text and preserves the caller disableSend guard', async () => {
  const file = new File(['file'], 'message.txt');
  const { view, control, onSendInput } = await fixture({
    pendingUploads: [{ id: 'ready', status: FileStatusValue.EDIT, file }],
  });
  expect(control.hasValidInput).toBe(true);
  send(control);
  expect(onSendInput.mock.calls).toEqual([['', undefined]]);
  await update(view, { disableSend: true });
  expect(control.disableSend).toBe(true);
  send(control);
  expect(onSendInput).toHaveBeenCalledTimes(1);
});

it('announces the focus shortcut once after an initially disabled shortcut is enabled', async () => {
  const { view, prompt, store } = await fixture({}, (store) => {
    applyConfigChange(store, {
      keyboardShortcuts: {
        messageFocusToggle: { key: 'F6', modifiers: {}, isOn: false },
      },
    });
  });
  const dispatch = jest.spyOn(store, 'dispatch');
  prompt.dispatchEvent(new CustomEvent('cds-aichat-prompt-focus'));
  expect(dispatch).not.toHaveBeenCalled();
  applyConfigChange(store, {
    keyboardShortcuts: {
      messageFocusToggle: { key: 'F6', modifiers: {}, isOn: true },
    },
  });
  await flush(view);
  dispatch.mockClear();
  prompt.dispatchEvent(new CustomEvent('cds-aichat-prompt-focus'));
  prompt.dispatchEvent(new CustomEvent('cds-aichat-prompt-focus'));
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch).toHaveBeenCalledWith(
    actions.announceMessage({
      messageID: 'input_keyboardShortcutAnnouncement',
      messageValues: { key: 'F6' },
    })
  );
});

it('keeps local typing when tracking turns on and clears tracked focus when tracking turns off', async () => {
  const { view, prompt, store, onSendInput, control } = await fixture(
    {},
    (store) => {
      store.dispatch(
        actions.updateInputState({ rawValue: 'stored draft' }, false)
      );
    }
  );
  change(prompt, 'local draft');
  await flush(view);
  expect(selectInputState(store.getState()).rawValue).toBe('stored draft');
  await update(view, { trackInputState: true });
  send(control);
  expect(onSendInput).toHaveBeenCalledWith('local draft', undefined);
  change(prompt, 'tracked draft');
  prompt.dispatchEvent(new CustomEvent('cds-aichat-prompt-focus'));
  expect(selectInputState(store.getState()).rawValue).toBe('tracked draft');
  expect(selectInputState(store.getState()).focused).toBe(true);
  await update(view, { trackInputState: false });
  expect(selectInputState(store.getState()).focused).toBe(false);
  change(prompt, 'local again');
  await flush(view);
  expect(selectInputState(store.getState()).rawValue).toBe('tracked draft');
  send(control);
  expect(onSendInput).toHaveBeenLastCalledWith('local again', undefined);
});

it('retains a configured extension and its live custom node view on unrelated updates', async () => {
  const buildNodeView = jest.fn(() => {
    const dom = document.createElement('span');
    dom.dataset.nativeIdentity = '';
    return { dom };
  });
  const token = TiptapNode.create({
    name: 'nativeIdentityToken',
    group: 'inline',
    inline: true,
    atom: true,
    parseHTML: () => [{ tag: 'span[data-native-identity]' }],
    renderHTML: () => ['span', { 'data-native-identity': '' }],
    addNodeView: () => buildNodeView,
  });
  const extensions = [token as unknown as Extension];
  const { view, prompt, store } = await fixture({}, (store) => {
    applyConfigChange(store, { input: { tiptap: { extensions } } });
  });
  const editor = await view.inputFunctions.ensureEditor();
  view.inputFunctions.setContent({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'nativeIdentityToken' },
          { type: 'text', text: 'draft' },
        ],
      },
    ],
  });
  await flush(view);
  const configuredExtensions = prompt.extensions;
  const editorExtensions = editor.extensionManager.extensions;
  const nodeViews = editor.view.props.nodeViews;
  const tokenDOM = editor.view.nodeDOM(1);
  expect(tokenDOM).toBeInstanceOf(HTMLElement);
  expect((tokenDOM as HTMLElement).dataset.nativeIdentity).toBe('');
  expect(buildNodeView).toHaveBeenCalledTimes(1);
  editor.commands.insertContentAt(6, ' typing');
  applyConfigChange(store, {
    header: { title: 'Unrelated title' },
    input: { tiptap: { extensions } },
  });
  await flush(view);
  expect(view.inputFunctions.getEditor()).toBe(editor);
  expect(prompt.extensions).toBe(configuredExtensions);
  expect(editor.extensionManager.extensions).toBe(editorExtensions);
  expect(editor.view.props.nodeViews).toBe(nodeViews);
  expect(editor.view.nodeDOM(1)).toBe(tokenDOM);
  expect(buildNodeView).toHaveBeenCalledTimes(1);
});

it('retains the expanded error state when its title and description change continuously', async () => {
  const { view } = await fixture({
    error: {
      title: 'First error',
      description: 'First detail',
      collapsible: true,
    },
  });
  const error = view.querySelector<ErrorMessage>('cds-aichat-error-message');
  await error.updateComplete;
  const button = error.shadowRoot.querySelector<HTMLElement>('cds-icon-button');
  button.click();
  await error.updateComplete;
  expect(error.shadowRoot.textContent).toContain('First detail');
  await update(view, {
    error: {
      title: 'Second error',
      description: 'Second detail',
      collapsible: true,
    },
  });
  await error.updateComplete;
  expect(view.querySelector('cds-aichat-error-message')).toBe(error);
  expect(error.shadowRoot.textContent).toContain('Second detail');
  expect(
    error.shadowRoot.querySelector('cds-icon-button').getAttribute('aria-label')
  ).toBe('Collapse error message');
});

it('seeds tracked raw value when the first props arrive after connection', async () => {
  const { view, control, onSendInput } = await fixture(
    { trackInputState: true },
    (store) => {
      store.dispatch(
        actions.updateInputState({ rawValue: 'prefilled tracked value' }, false)
      );
    },
    true
  );
  expect(control.hasValidInput).toBe(true);
  send(control);
  expect(onSendInput).toHaveBeenCalledWith(
    'prefilled tracked value',
    undefined
  );
  await update(view, { trackInputState: false });
  const prompt = view.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  change(prompt, 'later local value');
  await update(view, { trackInputState: true });
  send(control);
  expect(onSendInput).toHaveBeenLastCalledWith('later local value', undefined);
});

it('mirrors local divergence on a store notification even when the tracked raw value and slice are unchanged', async () => {
  const { view, prompt, control, store, onSendInput } = await fixture({
    trackInputState: true,
    maxInputChars: 3,
  });
  change(prompt, 'stored over limit');
  await flush(view);
  const autocomplete = view.querySelector<NativeAutocomplete>(
    'cds-aichat-native-autocomplete'
  );
  autocomplete.onStarterSelected('ok');
  expect(onSendInput).not.toHaveBeenCalled();
  store.dispatch(actions.changeState({ chatHeight: 501 }));
  await update(view, { maxInputChars: 100 });
  send(control);
  expect(onSendInput.mock.calls[0][0]).toBe('stored over limit');
});

it('does not update the input view for an unrelated store notification with no value or slice change', async () => {
  const { view, store } = await fixture({ trackInputState: true });
  const requestUpdate = jest.spyOn(view, 'requestUpdate');
  store.dispatch(actions.changeState({ chatHeight: 501 }));
  await Promise.resolve();
  expect(requestUpdate).not.toHaveBeenCalled();
});

it('notifies current handle changes for real lifetimes while same-task moves retain their handle', async () => {
  const { view, provider, manager } = await fixture();
  const initial = view.inputFunctions;
  const notifications: (InputFunctions | null)[] = [];
  view.addEventListener(
    'cds-aichat-input-handle-change',
    (event: CustomEvent<InputFunctions | null>) => {
      notifications.push(event.detail);
      expect(view.inputFunctions ?? null).toBe(event.detail);
      expect(event.bubbles).toBe(false);
      expect(event.composed).toBe(false);
    }
  );
  view.remove();
  provider.shadowRoot.append(view);
  await flush(view);
  expect(view.inputFunctions).toBe(initial);
  expect(notifications).toEqual([]);
  view.remove();
  await Promise.resolve();
  expect(view.inputFunctions).toBeUndefined();
  expect(manager.getInputFunctionsRef()).toBeNull();
  expect(notifications).toEqual([null]);
  provider.shadowRoot.append(view);
  const replacement = view.inputFunctions;
  expect(replacement).toBeDefined();
  expect(replacement).not.toBe(initial);
  expect(notifications).toEqual([null, replacement]);
  expect(initial.requestFocus()).toBe(false);
  await flush(view);
  expect(manager.getInputFunctionsRef()).toBe(replacement);
  expect(replacement.requestFocus()).toBe(true);
});

it('notifies handle creation when context first arrives after attachment', async () => {
  const { view, state } = await fixture();
  const inputProps = view.inputProps;
  view.remove();
  await Promise.resolve();
  const provider = document.createElement(
    'test-native-input-provider'
  ) as InputProvider;
  document.body.append(provider);
  await provider.updateComplete;
  const late = document.createElement('cds-aichat-chat-input');
  late.inputProps = inputProps;
  const handles: (InputFunctions | null)[] = [];
  late.addEventListener(
    'cds-aichat-input-handle-change',
    (event: CustomEvent<InputFunctions | null>) => {
      handles.push(event.detail);
    }
  );
  provider.shadowRoot.append(late);
  await late.updateComplete;
  expect(late.inputFunctions).toBeUndefined();
  provider.provider.setValue(state);
  await flush(late);
  expect(handles).toEqual([late.inputFunctions]);
  expect(late.inputFunctions).toBeDefined();
});

it('removes its moved actions placeholder on compact layout and creates one replacement on expansion', async () => {
  const { view, store } = await fixture();
  applyConfigChange(store, { input: { expanded: true } });
  await flush(view);
  const selector = 'cds-aichat-prompt-line-slot[slot="message-actions"]';
  const original = view.querySelector(selector);
  expect(original).not.toBeNull();
  original.parentElement.append(original);
  await flush(view);
  expect(view.querySelector(selector)).toBe(original);
  applyConfigChange(store, { input: { expanded: false } });
  await flush(view);
  expect(view.querySelector(selector)).toBeNull();
  expect(original.isConnected).toBe(false);
  applyConfigChange(store, { input: { expanded: true } });
  await flush(view);
  expect(view.querySelectorAll(selector)).toHaveLength(1);
  expect(view.querySelector(selector)).not.toBe(original);
});

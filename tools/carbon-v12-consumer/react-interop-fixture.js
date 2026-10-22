/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import * as ReactDOM from 'react-dom';
import { createComponent } from '@lit/react';
import { LitElement, html } from 'lit';
import Markdown from '@carbon/ai-chat-components/es/react/markdown.js';
import FileUploads from '@carbon/ai-chat-components/es/react/file-uploads.js';
import PromptLine from '@carbon/ai-chat-components/es/react/prompt-line.js';
import ConversationalSearch from '@carbon/ai-chat-components/es/react/conversational-search-shell.js';
import { FileStatusValue } from '@carbon/ai-chat-components/es/components/aichat-prompt-line/index.js';

class BrowserInteropElement extends LitElement {
  static properties = {
    textValue: {},
    booleanValue: {},
    objectValue: { attribute: false },
    arrayValue: { attribute: false },
    formatter: { attribute: false },
    accepted: { state: true },
  };
  constructor() {
    super();
    this.textValue = 'initial';
    this.booleanValue = false;
    this.objectValue = { label: 'initial' };
    this.arrayValue = [];
    this.formatter = (value) => value;
    this.accepted = 0;
  }
  activate() {
    if (
      this.dispatchEvent(
        new CustomEvent('caic-browser-change', {
          detail: { value: this.textValue },
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      )
    ) {
      this.accepted += 1;
    }
  }
  render() {
    return html`<output
        >${this.textValue ?? 'removed'}|${String(this.booleanValue)}|${this.objectValue?.label ?? 'removed'}|${this.arrayValue?.join(',') ?? 'removed'}|${this.formatter?.('formatted') ?? 'removed'}</output
      ><button @click=${this.activate}>Activate</button>`;
  }
}
customElements.define('caic-browser-interop', BrowserInteropElement);
const NativeInterop = createComponent({
  tagName: 'caic-browser-interop',
  elementClass: BrowserInteropElement,
  react: React,
  events: { onChange: 'caic-browser-change', onNativeClick: 'click' },
});
const check = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};
const equal = (actual, expected, message) =>
  check(Object.is(actual, expected), message);
async function settle(host) {
  await host.updateComplete;
  await Promise.resolve();
  await host.updateComplete;
}

async function probeRefCleanup({ mount, unmount }, native, objectRef) {
  const refCalls = [];
  await mount(
    React.createElement(NativeInterop, {
      ref: (value) => {
        refCalls.push(value);
      },
    })
  );
  equal(objectRef.current, null, 'Changed object ref must clear.');
  equal(
    refCalls[refCalls.length - 1],
    native,
    'Callback ref must receive the concrete element.'
  );
  unmount();
  equal(
    refCalls[refCalls.length - 1],
    null,
    'Callback ref must clear on unmount.'
  );
}

async function probeProperties({ mount, host, unmount }) {
  const objectRef = React.createRef();
  const firstObject = { label: 'first object' };
  const secondObject = { label: 'second object' };
  const firstArray = ['first'];
  const secondArray = ['second', 'third'];
  const firstFunction = (value) => `first ${value}`;
  const secondFunction = (value) => `second ${value}`;
  const props = (next) => ({
    ref: objectRef,
    textValue: next ? 'second' : 'first',
    booleanValue: !next,
    objectValue: next ? secondObject : firstObject,
    arrayValue: next ? secondArray : firstArray,
    formatter: next ? secondFunction : firstFunction,
  });
  await mount(React.createElement(NativeInterop, props(false)));
  const native = host('caic-browser-interop');
  await settle(native);
  equal(
    objectRef.current,
    native,
    'Object ref must point to the concrete element.'
  );
  equal(native.textValue, 'first', 'String property must mount.');
  equal(native.booleanValue, true, 'Boolean property must mount.');
  equal(native.objectValue, firstObject, 'Object identity must mount.');
  equal(native.arrayValue, firstArray, 'Array identity must mount.');
  equal(native.formatter, firstFunction, 'Function identity must mount.');
  equal(
    native.shadowRoot.querySelector('output').textContent,
    'first|true|first object|first|first formatted',
    'Mounted shadow content must reflect all properties.'
  );
  await mount(React.createElement(NativeInterop, props(true)));
  await settle(native);
  equal(
    host('caic-browser-interop'),
    native,
    'Updating props must retain the element.'
  );
  equal(native.textValue, 'second', 'String property must update.');
  equal(native.booleanValue, false, 'Boolean property must update.');
  equal(native.objectValue, secondObject, 'Object identity must update.');
  equal(native.arrayValue, secondArray, 'Array identity must update.');
  equal(native.formatter, secondFunction, 'Function identity must update.');
  equal(
    native.shadowRoot.querySelector('output').textContent,
    'second|false|second object|second,third|second formatted',
    'Updated shadow content must reflect all properties.'
  );
  await mount(React.createElement(NativeInterop, { ref: objectRef }));
  await settle(native);
  for (const name of [
    'textValue',
    'booleanValue',
    'objectValue',
    'arrayValue',
    'formatter',
  ]) {
    equal(native[name], undefined, `Omitted ${name} must clear.`);
  }
  equal(
    native.shadowRoot.querySelector('output').textContent,
    'removed|undefined|removed|removed|removed',
    'Removed properties must clear shadow content.'
  );
  await probeRefCleanup({ mount, unmount }, native, objectRef);
}

function assertCanceledShadowClick(
  eventsHost,
  { firstEvents, firstNative, firstClicks }
) {
  equal(firstEvents.length, 1, 'Custom event must fire once.');
  equal(
    firstEvents[0].detail.value,
    'requested',
    'Custom detail must reach the callback.'
  );
  equal(
    firstEvents[0].defaultPrevented,
    true,
    'Callback cancellation must reach the producer.'
  );
  equal(eventsHost.accepted, 0, 'Canceled action must not complete.');
  equal(firstNative.length, 1, 'Native DOM shadow click must fire once.');
  check(
    firstNative[0] instanceof MouseEvent,
    'Native DOM callback must receive MouseEvent.'
  );
  equal(
    firstClicks.length,
    1,
    'React onClick must receive a shadow button click once.'
  );
  check(
    firstClicks[0].nativeEvent instanceof MouseEvent,
    'React onClick must retain the native MouseEvent.'
  );
}

function assertReplacedShadowClick(
  eventsHost,
  {
    firstEvents,
    secondEvents,
    firstNative,
    secondNative,
    firstClicks,
    secondClicks,
  }
) {
  equal(firstEvents.length, 1, 'Replaced custom callback must stop.');
  equal(secondEvents.length, 1, 'Replacement custom callback must fire once.');
  equal(
    secondEvents[0].detail.value,
    'updated',
    'Replacement custom callback must receive current detail.'
  );
  equal(eventsHost.accepted, 1, 'Uncanceled action must complete.');
  equal(firstNative.length, 1, 'Replaced native DOM callback must stop.');
  equal(
    secondNative.length,
    1,
    'Replacement native DOM callback must fire once.'
  );
  equal(firstClicks.length, 1, 'Replaced React onClick must stop.');
  equal(secondClicks.length, 1, 'Replacement React onClick must fire once.');
}

async function probeEvents({ mount, host, unmount }) {
  const firstEvents = [];
  const secondEvents = [];
  const firstNative = [];
  const secondNative = [];
  const firstClicks = [];
  const secondClicks = [];
  await mount(
    React.createElement(NativeInterop, {
      textValue: 'requested',
      onChange: (event) => {
        firstEvents.push(event);
        event.preventDefault();
      },
      onNativeClick: (event) => firstNative.push(event),
      onClick: (event) => firstClicks.push(event),
    })
  );
  const eventsHost = host('caic-browser-interop');
  await settle(eventsHost);
  eventsHost.shadowRoot.querySelector('button').click();
  assertCanceledShadowClick(eventsHost, {
    firstEvents,
    firstNative,
    firstClicks,
  });
  await mount(
    React.createElement(NativeInterop, {
      textValue: 'updated',
      onChange: (event) => secondEvents.push(event),
      onNativeClick: (event) => secondNative.push(event),
      onClick: (event) => secondClicks.push(event),
    })
  );
  await settle(eventsHost);
  eventsHost.shadowRoot.querySelector('button').click();
  assertReplacedShadowClick(eventsHost, {
    firstEvents,
    secondEvents,
    firstNative,
    secondNative,
    firstClicks,
    secondClicks,
  });
  await mount(React.createElement(NativeInterop, { textValue: 'removed' }));
  await settle(eventsHost);
  eventsHost.shadowRoot.querySelector('button').click();
  equal(
    firstEvents.length + secondEvents.length,
    2,
    'Removed custom callbacks must stay removed.'
  );
  equal(
    firstNative.length + secondNative.length,
    2,
    'Removed native DOM callbacks must stay removed.'
  );
  equal(
    firstClicks.length + secondClicks.length,
    2,
    'Removed React onClick callbacks must stay removed.'
  );
  equal(eventsHost.accepted, 2, 'Action without a callback must complete.');
  unmount();
}

async function probeMarkdown({ mount, host, unmount }) {
  const markdownRef = React.createRef();
  await mount(
    React.createElement(Markdown, { ref: markdownRef, markdown: '**first**' })
  );
  const markdown = host('cds-aichat-markdown');
  await settle(markdown);
  equal(markdownRef.current, markdown, 'Markdown ref must be concrete.');
  equal(
    markdown.shadowRoot.querySelector('strong')?.textContent,
    'first',
    'Markdown must render its initial prop.'
  );
  await mount(
    React.createElement(Markdown, { ref: markdownRef, markdown: '_second_' })
  );
  await settle(markdown);
  equal(
    markdown.shadowRoot.querySelector('em')?.textContent,
    'second',
    'Markdown must update rendered content.'
  );
  equal(
    markdown.shadowRoot.querySelector('strong'),
    null,
    'Old Markdown content must clear.'
  );
  unmount();
  equal(markdownRef.current, null, 'Markdown ref must clear.');
}

async function clearFileUploads({ mount, unmount }, uploads, uploadRef) {
  const emptyUploads = [];
  await mount(
    React.createElement(FileUploads, { ref: uploadRef, uploads: emptyUploads })
  );
  await settle(uploads);
  equal(
    uploads.uploads,
    emptyUploads,
    'FileUploads must preserve the clearing array identity.'
  );
  equal(
    uploads.shadowRoot.querySelector('cds-aichat-file-upload-item'),
    null,
    'FileUploads must clear rendered files.'
  );
  unmount();
  equal(uploadRef.current, null, 'FileUploads ref must clear.');
}

async function probeFileUploads({ mount, host, unmount }) {
  const firstUploads = [
    {
      id: 'first',
      file: new File(['one'], 'first.txt'),
      status: FileStatusValue.EDIT,
    },
  ];
  const secondUploads = [
    {
      id: 'second',
      file: new File(['two'], 'second.txt'),
      status: FileStatusValue.EDIT,
    },
  ];
  const uploadRef = React.createRef();
  const removeEvents = [];
  const onFileRemove = (event) => removeEvents.push(event);
  await mount(
    React.createElement(FileUploads, {
      ref: uploadRef,
      uploads: firstUploads,
      onFileRemove,
    })
  );
  const uploads = host('cds-aichat-file-uploads');
  await settle(uploads);
  equal(uploadRef.current, uploads, 'FileUploads ref must be concrete.');
  equal(
    uploads.uploads,
    firstUploads,
    'FileUploads array identity must mount.'
  );
  let uploadItem = uploads.shadowRoot.querySelector(
    'cds-aichat-file-upload-item'
  );
  await settle(uploadItem);
  check(
    uploadItem.shadowRoot.textContent.includes('first.txt'),
    'FileUploads must render the first filename.'
  );
  await mount(
    React.createElement(FileUploads, {
      ref: uploadRef,
      uploads: secondUploads,
      onFileRemove,
    })
  );
  await settle(uploads);
  equal(
    uploads.uploads,
    secondUploads,
    'FileUploads array identity must update.'
  );
  uploadItem = uploads.shadowRoot.querySelector('cds-aichat-file-upload-item');
  await settle(uploadItem);
  const carbonItem = uploadItem.shadowRoot.querySelector(
    'cds-file-uploader-item'
  );
  await settle(carbonItem);
  carbonItem.shadowRoot.querySelector('button.cds--file-close').click();
  equal(removeEvents.length, 1, 'FileUploads remove callback must fire once.');
  equal(
    removeEvents[0].detail.fileId,
    'second',
    'FileUploads callback must identify the current file.'
  );
  await clearFileUploads({ mount, unmount }, uploads, uploadRef);
}

function assertPromptMount(prompt, promptRef, firstContent, firstExtensions) {
  equal(promptRef.current, prompt, 'PromptLine ref must be concrete.');
  equal(prompt.content, firstContent, 'PromptLine object identity must mount.');
  equal(
    prompt.extensions,
    firstExtensions,
    'PromptLine array identity must mount.'
  );
  const textarea = prompt.querySelector('textarea');
  check(textarea, 'PromptLine must render the actual textarea.');
  equal(
    textarea.value,
    'first prompt',
    'PromptLine must render initial content.'
  );
  equal(
    textarea.readOnly,
    true,
    'PromptLine disabled must reach the textarea.'
  );
  equal(textarea.placeholder, 'First', 'PromptLine placeholder must mount.');
  return textarea;
}

function assertPromptChanges(prompt, textarea, changes, initialChanges) {
  equal(
    changes.length,
    initialChanges + 1,
    'Content prop update must emit one change.'
  );
  equal(
    changes[initialChanges].detail.rawValue,
    'second prompt',
    'Content update callback must carry its value.'
  );
  textarea.value = 'user edit';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  equal(
    changes.length,
    initialChanges + 2,
    'User edit must emit one additional change.'
  );
  equal(
    changes[initialChanges + 1].detail.rawValue,
    'user edit',
    'User edit callback must carry its value.'
  );
  equal(
    prompt.getValue(),
    'user edit',
    'PromptLine must retain the user edit.'
  );
}

async function probePromptLine({ mount, host, unmount }) {
  const promptRef = React.createRef();
  const changes = [];
  const onChange = (event) => changes.push(event);
  const doc = (text) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });
  const firstContent = doc('first prompt');
  const secondContent = doc('second prompt');
  const firstExtensions = [];
  const secondExtensions = [];
  await mount(
    React.createElement(PromptLine, {
      ref: promptRef,
      content: firstContent,
      extensions: firstExtensions,
      disabled: true,
      placeholder: 'First',
      onChange,
    })
  );
  const prompt = host('cds-aichat-prompt-line');
  await settle(prompt);
  const textarea = assertPromptMount(
    prompt,
    promptRef,
    firstContent,
    firstExtensions
  );
  const initialChanges = changes.length;
  await mount(
    React.createElement(PromptLine, {
      ref: promptRef,
      content: secondContent,
      extensions: secondExtensions,
      disabled: false,
      placeholder: 'Second',
      onChange,
    })
  );
  await settle(prompt);
  equal(
    prompt.content,
    secondContent,
    'PromptLine object identity must update.'
  );
  equal(
    prompt.extensions,
    secondExtensions,
    'PromptLine array identity must update.'
  );
  equal(textarea.value, 'second prompt', 'PromptLine content must update.');
  equal(textarea.readOnly, false, 'PromptLine disabled must update.');
  equal(textarea.placeholder, 'Second', 'PromptLine placeholder must update.');
  assertPromptChanges(prompt, textarea, changes, initialChanges);
  unmount();
  equal(promptRef.current, null, 'PromptLine ref must clear.');
}

async function probeConversationalSearch({ mount, host, unmount }) {
  const searchRef = React.createRef();
  const toggles = [];
  const onCitationsToggle = (event) => toggles.push(event);
  const searchView = (open) =>
    React.createElement(
      ConversationalSearch,
      {
        ref: searchRef,
        citationsOpen: open,
        showCitationsToggle: true,
        citationsLabel: 'Sources',
        toggleLabel: 'Toggle sources',
        onCitationsToggle,
      },
      React.createElement('p', { slot: 'citations' }, 'Source content')
    );
  await mount(searchView(false));
  const search = host('cds-aichat-conversational-search-shell');
  await settle(search);
  equal(
    searchRef.current,
    search,
    'ConversationalSearch ref must be concrete.'
  );
  equal(search.citationsOpen, false, 'Controlled state must mount.');
  equal(
    search.citationsLabel,
    'Sources',
    'ConversationalSearch label must mount.'
  );
  const slot = search.shadowRoot.querySelector('slot[name="citations"]');
  equal(
    slot.assignedElements()[0].textContent,
    'Source content',
    'Citations slot must project the supplied content.'
  );
  equal(slot.parentElement.hidden, true, 'Closed citations must be hidden.');
  search.shadowRoot.querySelector('button').click();
  equal(toggles.length, 1, 'Citations callback must fire once.');
  equal(toggles[0].detail.open, true, 'Citations callback must request open.');
  equal(
    search.citationsOpen,
    false,
    'Callback must not change controlled state.'
  );
  await mount(searchView(true));
  await settle(search);
  equal(search.citationsOpen, true, 'Controlled state must update.');
  equal(slot.parentElement.hidden, false, 'Open citations must be visible.');
  search.shadowRoot.querySelector('button').click();
  equal(toggles.length, 2, 'Second citations toggle must add one callback.');
  equal(
    toggles[1].detail.open,
    false,
    'Second citations callback must request closed.'
  );
  equal(
    search.citationsOpen,
    true,
    'Second callback must retain controlled state.'
  );
  unmount();
  equal(searchRef.current, null, 'ConversationalSearch ref must clear.');
}

export async function runReactInterop({
  container,
  render,
  unmount,
  expectedMajor,
}) {
  const major = Number(React.version.split('.')[0]);
  equal(
    major,
    expectedMajor,
    'The browser must load the selected React major.'
  );
  equal(
    ReactDOM.version.split('-')[0],
    React.version,
    'ReactDOM must match React.'
  );
  equal(
    customElements.get('caic-browser-interop'),
    BrowserInteropElement,
    'The native fixture must be registered.'
  );
  const checks = [];
  for (const strictMode of major >= 18 ? [false, true] : [false]) {
    const mount = async (node) => {
      render(
        strictMode ? React.createElement(React.StrictMode, null, node) : node
      );
      await Promise.resolve();
    };
    const host = (tag) => {
      const result = container.querySelector(tag);
      check(result, `Missing ${tag}.`);
      return result;
    };
    const context = { mount, host, unmount };
    await probeProperties(context);
    checks.push(`properties-and-refs:${strictMode}`);
    await probeEvents(context);
    checks.push(`events:${strictMode}`);
    await probeMarkdown(context);
    await probeFileUploads(context);
    await probePromptLine(context);
    await probeConversationalSearch(context);
    checks.push(`exported-wrappers:${strictMode}`);
  }
  return { react: React.version, reactDOM: ReactDOM.version, checks };
}

export function startReactInterop(options) {
  return runReactInterop(options)
    .then((report) => {
      options.container.textContent = JSON.stringify(report);
      options.container.dataset.interopStatus = 'passed';
      return report;
    })
    .catch((error) => {
      options.container.textContent = String(error.stack ?? error);
      options.container.dataset.interopStatus = 'failed';
      console.error(error);
      throw error;
    });
}

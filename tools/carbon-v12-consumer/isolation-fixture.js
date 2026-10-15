/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Close16 from '@carbon/icons/es/close/16.js';

function silentAudioSource() {
  const samples = 2000;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  for (const [offset, text] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data'],
  ]) {
    bytes.set(new TextEncoder().encode(text), offset);
  }
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, samples * 2, true);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}

async function localVideoSource() {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const stream = canvas.captureStream(10);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  recorder.addEventListener('dataavailable', (event) =>
    chunks.push(event.data)
  );
  const stopped = new Promise((resolve) =>
    recorder.addEventListener('stop', resolve, { once: true })
  );
  recorder.start();
  const context = canvas.getContext('2d');
  context.fillStyle = '#0f62fe';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await new Promise((resolve) => setTimeout(resolve, 300));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  return `${URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))}#isolated.webm`;
}

export async function propsFor(tag) {
  const suffix = tag.replace('cds-aichat-', '');
  if (suffix === 'video-player') {
    return { source: await localVideoSource() };
  }
  const cases = {
    'audio-player': { source: silentAudioSource() },
    'card-footer': { actions: [{ id: 'run', label: 'Run isolated action' }] },
    'card-steps': {
      steps: [
        { title: 'Complete step', kind: 'succeeded' },
        { title: 'Active step', kind: 'in-progress' },
      ],
    },
    transcript: { text: 'Isolated transcript', expanded: true },
    markdown: {
      markdown:
        'Isolated markdown\n\n```js\nconst isolated = true;\n```\n\n| Column |\n| --- |\n| Value |',
    },
    toolbar: {
      style: { display: 'block', width: '180px' },
      titleText: 'Isolated toolbar',
      actions: Array.from({ length: 6 }, (_, index) => ({
        text: `Isolated action ${index}`,
        icon: Close16,
        onClick() {},
      })),
      overflow: true,
    },
    'chat-header': {
      headerTitle: 'Isolated header',
      navigationType: 'overflow',
      navigationOverflowItems: [
        { text: 'Menu action' },
        { text: 'Other action', divider: true },
      ],
    },
    'history-header': {
      headerTitle: 'Isolated history',
      showCloseAction: true,
    },
    'history-panel-menu': { title: 'Isolated group', expanded: true },
    'history-panel-item': {
      name: 'Isolated conversation',
      showActions: true,
      actions: [{ text: 'Rename' }, { text: 'Delete', divider: true }],
    },
    'history-panel-item-input': { value: 'Isolated conversation' },
    'history-search-item': {
      name: 'Isolated result',
      date: 'Today',
    },
    'history-content': { resultsLabel: 'Isolated results', resultsCount: '1' },
    'file-upload-item': {
      readOnly: true,
      upload: { id: 'file', name: 'isolated.txt', mimeType: 'text/plain' },
    },
    'file-uploads': {
      uploads: [
        {
          id: 'file',
          file: new File(['Isolated file'], 'isolated.txt', {
            type: 'text/plain',
          }),
          status: 'complete',
        },
      ],
    },
    feedback: {
      isOpen: true,
      showTextArea: true,
      showBody: true,
      title: 'Isolated feedback',
      categories: ['Useful'],
      disclaimer: 'Isolated disclaimer',
      disclaimerCheckbox: 'Agree',
      primaryLabel: 'Submit feedback',
    },
    autocomplete: {
      items: [
        {
          id: 'choice',
          label: 'Isolated suggestion',
          text: 'Isolated suggestion',
        },
      ],
    },
    'error-message': {
      title: 'Isolated error',
      description: 'Isolated explanation',
      collapsible: true,
    },
    'input-send-control': { hasValidInput: true },
    'send-control': { hasValidInput: true },
    'prompt-line': { content: 'Isolated prompt', ariaLabel: 'Isolated prompt' },
    'prompt-line-shell': { expanded: true },
    panel: {
      open: true,
      showChatHeader: true,
      style: {
        position: 'relative',
        display: 'block',
        width: '520px',
        height: '420px',
      },
    },
    shell: {
      showHistory: true,
      showWorkspace: true,
      style: { display: 'block', width: '520px', height: '520px' },
    },
    'workspace-shell': {
      style: { display: 'block', width: '520px', height: '420px' },
    },
    'workspace-shell-header': {
      titleText: 'Isolated workspace',
      subTitleText: 'Workspace details',
    },
    'workspace-shell-footer': {
      actions: [
        { id: 'save', label: 'Save isolated workspace', kind: 'primary' },
      ],
    },
    'truncated-text': {
      value: 'Isolated truncated text '.repeat(20),
      lines: 1,
      type: 'tooltip',
      style: { display: 'block', width: '180px', lineHeight: '24px' },
    },
    'code-snippet': {
      style: { display: 'block', width: '180px' },
      overflow: true,
      actions: Array.from({ length: 6 }, (_, index) => ({
        text: `Code action ${index}`,
        icon: Close16,
        onClick() {},
      })),
      code: Array.from(
        { length: 30 },
        (_, index) => `const isolated${index} = true;`
      ).join('\n'),
      language: 'javascript',
    },
    table: {
      headers: [{ text: 'Column' }],
      rows: Array.from({ length: 12 }, (_, index) => ({
        cells: [{ text: `Row ${index}` }],
      })),
    },
    'reasoning-step': { title: 'Isolated reasoning', open: true },
    'reasoning-steps': { open: true },
    'chain-of-thought': { open: true },
    'chain-of-thought-step': {
      title: 'Isolated thought',
      open: true,
      status: 'processing',
    },
    'tool-call-data': { toolName: 'Isolated tool' },
    'conversational-search-shell': {
      citationsOpen: true,
      showCitationsToggle: true,
    },
  };
  return cases[suffix] ?? {};
}

export function slotChildren(
  create = (tag, props, text) => {
    const element = document.createElement(tag);
    Object.assign(element, props);
    element.textContent = text;
    return element;
  }
) {
  return [
    '',
    'header',
    'title',
    'content',
    'body',
    'footer',
    'main',
    'messages',
    'workspace',
    'history',
    'citations',
    'input',
    'output',
    'editor',
    'message-actions',
    'send-control',
    'field-messaging',
    'toolbar',
    'notification',
    'description',
    'header-description',
  ].map((slot, index) =>
    create('span', { slot, key: index }, `Isolated ${slot || 'content'}`)
  );
}

export async function settle() {
  for (let pass = 0; pass < 5; pass += 1) {
    await Promise.all(
      collect(document).map((element) => element.updateComplete)
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

export function collect(root) {
  return Array.from(root.querySelectorAll('*')).flatMap((element) => [
    element,
    ...(element.shadowRoot ? collect(element.shadowRoot) : []),
  ]);
}

export function runtimeTags() {
  return collect(document)
    .filter((element) => element.localName.startsWith('cds-'))
    .map((element) => {
      const constructor = customElements.get(element.localName);
      return {
        tag: element.localName,
        defined: !!constructor,
        upgraded: !!constructor && element instanceof constructor,
        shadow: !!element.shadowRoot,
      };
    });
}

export async function describe(element, constructor) {
  await settle();
  const lazyChildren = {
    'cds-aichat-audio-player': ['audio[aria-busy="false"]'],
    'cds-aichat-video-player': ['video[aria-busy="false"]'],
    'cds-aichat-shell': ['cds-aichat-panel'],
    'cds-aichat-table': ['cds-table', 'cds-pagination'],
    'cds-aichat-truncated-text': ['cds-tooltip', 'cds-tooltip-content'],
    'cds-aichat-markdown': ['cds-aichat-code-snippet', 'cds-aichat-table'],
    'cds-aichat-code-snippet': ['cds-aichat-toolbar', 'cds-button'],
  }[element.localName];
  if (lazyChildren) {
    const deadline = performance.now() + 10000;
    while (
      lazyChildren.some(
        (selector) => !element.shadowRoot?.querySelector(selector)
      )
    ) {
      if (performance.now() >= deadline) {
        throw new Error(
          `Expected lazy children ${lazyChildren.join(', ')} in ${element.localName}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      await settle();
    }
  }
  const content = collect(element.shadowRoot ?? element).filter(
    (child) => !['STYLE', 'SLOT'].includes(child.tagName)
  );
  return {
    tag: element.localName,
    registeredIdentity: customElements.get(element.localName) === constructor,
    upgraded: element instanceof constructor,
    shadow: !!element.shadowRoot,
    renderRootIdentity:
      element.localName === 'cds-aichat-autocomplete-controller'
        ? element.renderRoot === element && !element.shadowRoot
        : !!element.shadowRoot && element.renderRoot === element.shadowRoot,
    visible: [...content, ...element.children].some((child) => {
      const box = child.getBoundingClientRect();
      return (
        box.width > 0 &&
        box.height > 0 &&
        getComputedStyle(child).visibility !== 'hidden'
      );
    }),
    rendered:
      content.length > 0 ||
      Array.from(element.shadowRoot?.querySelectorAll('slot') ?? []).some(
        (slot) => slot.assignedNodes().length > 0
      ),
  };
}

export async function appendComponent(element) {
  if (element.localName === 'cds-aichat-truncated-text') {
    element.replaceChildren();
  }
  if (
    [
      'cds-aichat-toolbar',
      'cds-aichat-truncated-text',
      'cds-aichat-code-snippet',
    ].includes(element.localName)
  ) {
    element.style.inlineSize = '180px';
    element.style.display = 'block';
  }
  if (element.localName !== 'cds-aichat-autocomplete-controller') {
    document.body.append(element);
    return;
  }
  const shell = document.createElement('cds-aichat-prompt-line-shell');
  const editor = document.createElement('cds-aichat-prompt-line');
  editor.slot = 'editor';
  element.slot = 'autocomplete-content';
  element.starters = {
    items: [
      { id: 'starter', label: 'Isolated starter', text: 'Isolated starter' },
    ],
  };
  shell.append(editor, element);
  document.body.append(shell);
  await settle();
  editor.dispatchEvent(
    new CustomEvent('cds-aichat-trigger-change', {
      bubbles: true,
      composed: true,
      detail: { type: 'starter', query: '', triggerOffset: 0 },
    })
  );
  await settle();
}

export async function conditionalStates(element) {
  const states = {
    'cds-aichat-history-panel-item': [{ rename: true }],
    'cds-aichat-input-send-control': [{ isStopStreamingButtonVisible: true }],
    'cds-aichat-card-footer': [
      {
        actions: [
          { id: 'icon', label: '', icon: Close16, tooltipText: 'Icon action' },
        ],
      },
    ],
    'cds-aichat-table': [{ loading: true }],
    'cds-aichat-chat-header': [
      { navigationType: 'back', navigationBackIcon: Close16 },
    ],
  };
  const tags = [];
  for (const props of states[element.localName] ?? []) {
    const previous = Object.fromEntries(
      Object.keys(props).map((key) => [key, element[key]])
    );
    Object.assign(element, props);
    await settle();
    tags.push(...runtimeTags());
    Object.assign(element, previous);
    await settle();
  }
  return tags;
}

export function assignProps(element, props) {
  const { style, ...properties } = props;
  Object.assign(element, properties);
  if (style) {
    Object.assign(element.style, style);
  }
}

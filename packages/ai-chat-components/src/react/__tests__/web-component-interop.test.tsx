/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import * as ReactDOM from 'react-dom';
import { act as legacyAct } from 'react-dom/test-utils';
import type { Root } from 'react-dom/client';
import type { LitElement } from 'lit';
import Markdown from '@carbon/ai-chat-components/es/react/markdown.js';
import FileUploads from '@carbon/ai-chat-components/es/react/file-uploads.js';
import PromptLine from '@carbon/ai-chat-components/es/react/prompt-line.js';
import ConversationalSearchShell from '@carbon/ai-chat-components/es/react/conversational-search-shell.js';
import type MarkdownElement from '@carbon/ai-chat-components/es/components/aichat-markdown/aichat-markdown.js';
import type FileUploadsElement from '@carbon/ai-chat-components/es/components/aichat-file-uploads/aichat-file-uploads.js';
import type PromptLineElement from '@carbon/ai-chat-components/es/components/aichat-prompt-line/aichat-prompt-line.js';
import type ConversationalSearchElement from '@carbon/ai-chat-components/es/components/aichat-conversational-search/aichat-conversational-search-shell.js';
import {
  FileStatusValue,
  type FileUpload,
} from '@carbon/ai-chat-components/es/components/aichat-prompt-line/index.js';
import {
  InteropElement,
  NativeInterop,
  type InteropDetail,
} from './web-component-interop-fixture.js';

declare const CAIC_INTEROP_REACT_MAJOR: number | undefined;
const major = Number(React.version.split('.')[0]);
const expectedMajor =
  typeof CAIC_INTEROP_REACT_MAJOR === 'undefined'
    ? 19
    : CAIC_INTEROP_REACT_MAJOR;
const dom = ReactDOM as typeof ReactDOM & {
  version: string;
  render(node: React.ReactNode, container: HTMLElement): void;
  unmountComponentAtNode(container: HTMLElement): void;
};
const act: typeof React.act = major >= 19 ? React.act : legacyAct;
let container: HTMLDivElement;
let root: Root | undefined;
let mounted = false;

async function settle(element?: LitElement | null) {
  await element?.updateComplete;
  await Promise.resolve();
  await element?.updateComplete;
}
async function render(node: React.ReactNode) {
  await act(async () => {
    if (major === 17) {
      dom.render(node, container);
    } else {
      root ??= (await import('react-dom/client')).createRoot(container);
      root!.render(node);
    }
    mounted = true;
  });
}
async function unmount() {
  if (!mounted) {
    return;
  }
  await act(async () => {
    if (major === 17) {
      dom.unmountComponentAtNode(container);
    } else {
      root!.unmount();
    }
  });
  mounted = false;
  root = undefined;
}
function element<T extends HTMLElement>(tag: string): T {
  const result = container.querySelector<T>(tag);
  expect(result).not.toBeNull();
  return result!;
}
const modes = major >= 18 ? [false, true] : [false];
const strict = (node: React.ReactNode, enabled: boolean) =>
  enabled ? React.createElement(React.StrictMode, null, node) : node;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  await unmount();
  container.remove();
});

test('loads the browser Lit entry and matching React, ReactDOM, and JSX runtimes', () => {
  expect(major).toBe(expectedMajor);
  expect(dom.version).toBe(React.version);
  const normalize = (path: string) => path.replaceAll('\\', '/');
  const reactPath = normalize(require.resolve('react'));
  const domPath = normalize(require.resolve('react-dom'));
  const jsxPath = normalize(require.resolve('react/jsx-runtime'));
  console.info(
    'Interop runtime',
    JSON.stringify({
      react: React.version,
      reactDOM: dom.version,
      reactPath,
      domPath,
      jsxPath,
      litReactPath: normalize(require.resolve('@lit/react')),
      fixtureRegistered:
        customElements.get('caic-interop-fixture') === InteropElement,
    })
  );
  const runtimeRoot =
    expectedMajor === 19
      ? '/node_modules/'
      : `/examples/react/frameworks-react-${expectedMajor}/node_modules/`;
  expect(reactPath).toContain(`${runtimeRoot}react/index.js`);
  expect(domPath).toContain(`${runtimeRoot}react-dom/index.js`);
  expect(jsxPath).toContain(`${runtimeRoot}react/jsx-runtime.js`);
  expect(normalize(require.resolve('@lit/react'))).not.toContain(
    '/@lit/react/node/'
  );
  expect(normalize(require.resolve('@lit/react'))).toMatch(
    /\/@lit\/react\/(development\/)?index\.js$/
  );
  expect(customElements.get('caic-interop-fixture')).toBe(InteropElement);
});

describe.each(modes)('native Lit interop (StrictMode=%s)', (isStrict) => {
  test('preserves every property value and identity on mount/update, then clears omitted properties', async () => {
    const firstObject = { label: 'first object' };
    const secondObject = { label: 'second object' };
    const firstArray = ['first'];
    const secondArray = ['second', 'third'];
    const firstFunction = (value: string) => `first ${value}`;
    const secondFunction = (value: string) => `second ${value}`;
    const ref = React.createRef<InteropElement>();
    await render(
      strict(
        React.createElement(NativeInterop, {
          ref,
          textValue: 'first',
          booleanValue: true,
          objectValue: firstObject,
          arrayValue: firstArray,
          formatter: firstFunction,
        }),
        isStrict
      )
    );
    const host = element<InteropElement>('caic-interop-fixture');
    await settle(host);
    expect(ref.current).toBe(host);
    expect(host.textValue).toBe('first');
    expect(host.booleanValue).toBe(true);
    expect(host.objectValue).toBe(firstObject);
    expect(host.arrayValue).toBe(firstArray);
    expect(host.formatter).toBe(firstFunction);
    expect(host.shadowRoot!.querySelector('output')!.textContent).toBe(
      'first|true|first object|first|first formatted'
    );

    await render(
      strict(
        React.createElement(NativeInterop, {
          ref,
          textValue: 'second',
          booleanValue: false,
          objectValue: secondObject,
          arrayValue: secondArray,
          formatter: secondFunction,
        }),
        isStrict
      )
    );
    await settle(host);
    expect(element('caic-interop-fixture')).toBe(host);
    expect(host.textValue).toBe('second');
    expect(host.booleanValue).toBe(false);
    expect(host.objectValue).toBe(secondObject);
    expect(host.arrayValue).toBe(secondArray);
    expect(host.formatter).toBe(secondFunction);
    expect(host.shadowRoot!.querySelector('output')!.textContent).toBe(
      'second|false|second object|second,third|second formatted'
    );

    await render(strict(React.createElement(NativeInterop, { ref }), isStrict));
    await settle(host);
    expect(host.textValue).toBeUndefined();
    expect(host.booleanValue).toBeUndefined();
    expect(host.objectValue).toBeUndefined();
    expect(host.arrayValue).toBeUndefined();
    expect(host.formatter).toBeUndefined();
    expect(host.shadowRoot!.querySelector('output')!.textContent).toBe(
      'removed|undefined|removed|removed|removed'
    );
    await unmount();
    expect(ref.current).toBeNull();
  });

  test('replaces/removes custom and native DOM handlers without duplicates, and honors cancellation', async () => {
    const first = jest.fn((event: CustomEvent<InteropDetail>) =>
      event.preventDefault()
    );
    const second = jest.fn((_event: CustomEvent<InteropDetail>) => {});
    const nativeFirst = jest.fn((_event: MouseEvent) => {});
    const nativeSecond = jest.fn((_event: MouseEvent) => {});
    await render(
      strict(
        React.createElement(NativeInterop, {
          textValue: 'requested',
          onChange: first,
          onNativeClick: nativeFirst,
        }),
        isStrict
      )
    );
    const host = element<InteropElement>('caic-interop-fixture');
    await settle(host);
    await act(async () => {
      host.shadowRoot!.querySelector('button')!.click();
    });
    await settle(host);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(first.mock.calls[0][0].detail).toEqual({ value: 'requested' });
    expect(first.mock.calls[0][0].defaultPrevented).toBe(true);
    expect(host.accepted).toBe(0);
    expect(nativeFirst).toHaveBeenCalledTimes(1);
    expect(nativeFirst.mock.calls[0][0]).toBeInstanceOf(MouseEvent);

    await render(
      strict(
        React.createElement(NativeInterop, {
          textValue: 'updated',
          onChange: second,
          onNativeClick: nativeSecond,
        }),
        isStrict
      )
    );
    await settle(host);
    await act(async () => {
      host.shadowRoot!.querySelector('button')!.click();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0][0].detail).toEqual({ value: 'updated' });
    expect(host.accepted).toBe(1);
    expect(nativeFirst).toHaveBeenCalledTimes(1);
    expect(nativeSecond).toHaveBeenCalledTimes(1);

    await render(
      strict(
        React.createElement(NativeInterop, { textValue: 'unhandled' }),
        isStrict
      )
    );
    await settle(host);
    await act(async () => {
      host.shadowRoot!.querySelector('button')!.click();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(host.accepted).toBe(2);
    expect(nativeFirst).toHaveBeenCalledTimes(1);
    expect(nativeSecond).toHaveBeenCalledTimes(1);
  });

  test('replaces and removes native host click handlers exactly once', async () => {
    const first = jest.fn();
    const second = jest.fn();
    await render(
      strict(React.createElement(NativeInterop, { onClick: first }), isStrict)
    );
    const host = element<InteropElement>('caic-interop-fixture');
    await settle(host);
    // happy-dom does not retarget shadow clicks to the host; real-browser probes cover that path.
    await act(async () => {
      host.click();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0].nativeEvent).toBeInstanceOf(MouseEvent);
    await render(
      strict(React.createElement(NativeInterop, { onClick: second }), isStrict)
    );
    await act(async () => {
      host.click();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    await render(strict(React.createElement(NativeInterop, {}), isStrict));
    await act(async () => {
      host.click();
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('forwards callback refs to the concrete element and clears changed refs and unmounted refs', async () => {
    const objects = React.createRef<InteropElement>();
    const callback = jest.fn((_host: InteropElement | null) => {});
    await render(
      strict(React.createElement(NativeInterop, { ref: objects }), isStrict)
    );
    const host = element<InteropElement>('caic-interop-fixture');
    expect(objects.current).toBe(host);
    await render(
      strict(React.createElement(NativeInterop, { ref: callback }), isStrict)
    );
    expect(objects.current).toBeNull();
    expect(callback.mock.calls[callback.mock.calls.length - 1]?.[0]).toBe(host);
    expect(
      callback.mock.calls.every(([value]) => value === null || value === host)
    ).toBe(true);
    await unmount();
    expect(callback.mock.calls[callback.mock.calls.length - 1]?.[0]).toBeNull();
  });
});

describe.each(modes)('exported wrappers (StrictMode=%s)', (isStrict) => {
  const renderWrapper = (node: React.ReactNode) =>
    render(strict(node, isStrict));
  test('exported Markdown updates rendered source and retains a concrete ref', async () => {
    const ref = React.createRef<MarkdownElement>();
    await renderWrapper(
      React.createElement(Markdown, { ref, markdown: '**first**' })
    );
    const host = element<MarkdownElement>('cds-aichat-markdown');
    await settle(host);
    expect(ref.current).toBe(host);
    expect(host.markdown).toBe('**first**');
    expect(host.shadowRoot!.querySelector('strong')?.textContent).toBe('first');
    await renderWrapper(
      React.createElement(Markdown, { ref, markdown: '_second_' })
    );
    await settle(host);
    expect(host.markdown).toBe('_second_');
    expect(host.shadowRoot!.querySelector('em')?.textContent).toBe('second');
    expect(host.shadowRoot!.querySelector('strong')).toBeNull();
    await unmount();
    expect(ref.current).toBeNull();
  });

  test('exported FileUploads preserves array identity, renders updates, and emits one real remove callback', async () => {
    const first: FileUpload[] = [
      {
        id: 'first',
        file: new File(['one'], 'first.txt'),
        status: FileStatusValue.EDIT,
      },
    ];
    const second: FileUpload[] = [
      {
        id: 'second',
        file: new File(['two'], 'second.txt'),
        status: FileStatusValue.EDIT,
      },
    ];
    const onFileRemove = jest.fn();
    const ref = React.createRef<FileUploadsElement>();
    await renderWrapper(
      React.createElement(FileUploads, { ref, uploads: first, onFileRemove })
    );
    const host = element<FileUploadsElement>('cds-aichat-file-uploads');
    await settle(host);
    expect(ref.current).toBe(host);
    expect(host.uploads).toBe(first);
    const firstItem = host.shadowRoot!.querySelector(
      'cds-aichat-file-upload-item'
    ) as LitElement & { upload: FileUpload };
    await settle(firstItem);
    expect(firstItem.upload).toBe(first[0]);
    expect(firstItem.shadowRoot!.textContent).toContain('first.txt');
    await renderWrapper(
      React.createElement(FileUploads, { ref, uploads: second, onFileRemove })
    );
    await settle(host);
    expect(host.uploads).toBe(second);
    const item = host.shadowRoot!.querySelector(
      'cds-aichat-file-upload-item'
    ) as LitElement;
    await settle(item);
    const carbon = item.shadowRoot!.querySelector(
      'cds-file-uploader-item'
    ) as LitElement;
    await settle(carbon);
    const remove = carbon.shadowRoot!.querySelector<HTMLButtonElement>(
      'button.cds--file-close'
    );
    expect(remove).not.toBeNull();
    await act(async () => {
      remove!.click();
    });
    expect(onFileRemove).toHaveBeenCalledTimes(1);
    expect(onFileRemove.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(onFileRemove.mock.calls[0][0].detail).toEqual({ fileId: 'second' });
    expect(host.uploads).toBe(second);
    const empty: FileUpload[] = [];
    await renderWrapper(
      React.createElement(FileUploads, { ref, uploads: empty, onFileRemove })
    );
    await settle(host);
    expect(host.uploads).toBe(empty);
    expect(
      host.shadowRoot!.querySelector('cds-aichat-file-upload-item')
    ).toBeNull();
    await unmount();
    expect(ref.current).toBeNull();
  });

  test('exported PromptLine forwards object/array/boolean/string props and reports real textarea edits', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'first prompt' }],
        },
      ],
    };
    const extensions: never[] = [];
    const ref = React.createRef<PromptLineElement>();
    const onChange = jest.fn();
    await renderWrapper(
      React.createElement(PromptLine, {
        ref,
        content,
        extensions,
        disabled: true,
        placeholder: 'First placeholder',
        onChange,
      })
    );
    const host = element<PromptLineElement>('cds-aichat-prompt-line');
    await settle(host);
    expect(ref.current).toBe(host);
    expect(host.content).toBe(content);
    expect(host.extensions).toBe(extensions);
    expect(host.rich).toBe(false);
    expect(host.disabled).toBe(true);
    const textarea = host.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea!.value).toBe('first prompt');
    expect(textarea!.placeholder).toBe('First placeholder');
    expect(textarea!.readOnly).toBe(true);
    const nextContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'second prompt' }],
        },
      ],
    };
    const nextExtensions: never[] = [];
    await renderWrapper(
      React.createElement(PromptLine, {
        ref,
        content: nextContent,
        extensions: nextExtensions,
        disabled: false,
        placeholder: 'Second placeholder',
        onChange,
      })
    );
    await settle(host);
    expect(host.content).toBe(nextContent);
    expect(host.extensions).toBe(nextExtensions);
    expect(textarea!.value).toBe('second prompt');
    expect(textarea!.placeholder).toBe('Second placeholder');
    expect(textarea!.readOnly).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(onChange.mock.calls[0][0].detail.rawValue).toBe('second prompt');
    await act(async () => {
      textarea!.value = 'user edit';
      textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0]).toBeInstanceOf(CustomEvent);
    expect(onChange.mock.calls[1][0].detail.rawValue).toBe('user edit');
    expect(host.getValue()).toBe('user edit');
    await unmount();
    expect(ref.current).toBeNull();
  });

  test('exported conversational search keeps controlled state and emits one callback per actual toggle', async () => {
    const ref = React.createRef<ConversationalSearchElement>();
    const onCitationsToggle = jest.fn();
    const view = (open: boolean) =>
      React.createElement(
        ConversationalSearchShell,
        {
          ref,
          citationsOpen: open,
          showCitationsToggle: true,
          citationsLabel: 'Sources',
          toggleLabel: 'Toggle sources',
          onCitationsToggle,
        },
        React.createElement('p', { slot: 'citations' }, 'Source content')
      );
    await renderWrapper(view(false));
    const host = element<ConversationalSearchElement>(
      'cds-aichat-conversational-search-shell'
    );
    await settle(host);
    expect(ref.current).toBe(host);
    expect(host.citationsOpen).toBe(false);
    expect(host.citationsLabel).toBe('Sources');
    const slot = host.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name="citations"]'
    )!;
    expect(slot.assignedElements()[0].textContent).toBe('Source content');
    expect(slot.parentElement!.hidden).toBe(true);
    await act(async () => {
      host.shadowRoot!.querySelector('button')!.click();
    });
    expect(onCitationsToggle).toHaveBeenCalledTimes(1);
    expect(onCitationsToggle.mock.calls[0][0].detail).toEqual({ open: true });
    expect(host.citationsOpen).toBe(false);
    await renderWrapper(view(true));
    await settle(host);
    expect(host.citationsOpen).toBe(true);
    expect(slot.parentElement!.hidden).toBe(false);
    await act(async () => {
      host.shadowRoot!.querySelector('button')!.click();
    });
    expect(onCitationsToggle).toHaveBeenCalledTimes(2);
    expect(onCitationsToggle.mock.calls[1][0].detail).toEqual({ open: false });
    expect(host.citationsOpen).toBe(true);
    await unmount();
    expect(ref.current).toBeNull();
  });
});

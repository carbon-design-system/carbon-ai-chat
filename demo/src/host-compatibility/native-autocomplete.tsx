/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import type { Context } from 'react';
import type PromptLine from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import type {
  AutocompleteConfig,
  CustomListProps,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/types.js';

interface ContentRequest {
  target: HTMLElement;
  anchor: HTMLElement;
}

interface ContentOwner {
  getSnapshot(): { request: ContentRequest | null };
  isReady(request: ContentRequest): boolean;
}

interface NativeAutocomplete extends HTMLElement {
  contentOwner: ContentOwner;
  promptLine: PromptLine;
  autocomplete: AutocompleteConfig;
  onSelectItem: (item: { id: string }) => void;
  onSendItem: (text: string) => void;
  listNavigated: boolean;
  updateComplete: Promise<boolean>;
}

interface Container extends HTMLElement {
  current?: {
    hosts: { autocompleteContent: ContentOwner };
    viewState: {
      serviceManager: {
        store: {
          getState(): { chatHeight: number; chatWidthBreakpoint: string };
        };
      };
    };
  };
}

export interface NativeAutocompleteProbe {
  shell: HTMLElement;
  prompt: PromptLine;
  native: NativeAutocomplete;
  borrowed: HTMLElement;
  keys: string[];
  selected: string[];
  sent: string[];
  borrowedClicks: number;
  query(query: string): void;
  releaseReady(): void;
  replaceResults(labels: string[]): void;
  clear(): void;
  move(): void;
  detach(): void;
  restore(): void;
  snapshot(): {
    ready: boolean;
    target: HTMLElement | null;
    anchor: HTMLElement | null;
    chatHeight: number;
    breakpoint: string;
  };
}

export interface NativeAutocompleteHarness {
  mountNativeAutocomplete?: (
    host: 'react' | 'wc',
    kind: 'builtin' | 'react' | 'element',
    delayReady?: boolean
  ) => Promise<void>;
  nativeAutocompletes?: Partial<
    Record<'react' | 'wc', NativeAutocompleteProbe>
  >;
}

interface ListProps extends CustomListProps {
  themeContext: Context<string>;
  probe: NativeAutocompleteProbe;
  gate: Promise<void>;
}

function ReactList(props: ListProps) {
  const theme = useContext(props.themeContext);
  const [count, setCount] = useState(0);
  const [alternateRoot, setAlternateRoot] = useState(false);
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const list = root.current;
    const onKey = (event: KeyboardEvent) => {
      props.probe.keys.push(event.key);
      if (event.key === 'Enter') {
        props.onSelect(props.items[0]);
      } else if (event.key === 'Escape') {
        props.onDismiss();
      }
    };
    list?.addEventListener('keydown', onKey);
    return () => list?.removeEventListener('keydown', onKey);
  });
  const Tag = alternateRoot ? 'section' : 'div';
  return (
    <Tag
      ref={(element) => {
        root.current = element;
        if (element) {
          Object.defineProperty(element, 'updateComplete', {
            configurable: true,
            value: props.gate,
          });
        }
      }}
      className="page-styled"
      data-testid="native-autocomplete-react-list"
      data-query={props.query}>
      <button type="button" onClick={() => setCount(count + 1)}>
        {theme}:{count}
      </button>
      <button type="button" onClick={() => setAlternateRoot(!alternateRoot)}>
        Replace list root
      </button>
      {props.items.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => props.onSelect(item)}>
          {item.label}
        </button>
      ))}
    </Tag>
  );
}

export function installNativeAutocompleteHarness(
  harness: NativeAutocompleteHarness,
  themeContext: Context<string>
) {
  const probes: NativeAutocompleteHarness['nativeAutocompletes'] = {};
  harness.nativeAutocompletes = probes;
  harness.mountNativeAutocomplete = async (host, kind, delayReady = false) => {
    probes[host]?.restore();
    const container =
      host === 'wc'
        ? document
            .getElementById('host-compat-wc')
            ?.shadowRoot?.querySelector<Container>('cds-aichat-container')
        : document.querySelector<Container>('cds-aichat-container');
    if (!container?.current || !container.shadowRoot) {
      throw new Error(`The ${host} chat container is not ready.`);
    }
    await customElements.whenDefined('cds-aichat-native-autocomplete');
    const current = container.current;
    const { autocompleteContent } = current.hosts;
    const originalShells = Array.from(
      container.shadowRoot.querySelectorAll<HTMLElement>(
        'cds-aichat-prompt-line-shell'
      )
    );
    const originalHidden = originalShells.map((shell) => shell.hidden);
    const originalDisplay = originalShells.map((shell) => shell.style.display);
    const bounds = originalShells[0].getBoundingClientRect();
    originalShells.forEach((shell) => {
      shell.hidden = true;
      shell.style.display = 'none';
    });
    const shell = document.createElement('cds-aichat-prompt-line-shell');
    shell.dataset.testid = `native-autocomplete-shell-${host}`;
    shell.style.position = 'fixed';
    shell.style.zIndex = '1';
    shell.style.insetInlineStart = `${bounds.left}px`;
    shell.style.insetBlockStart = `${bounds.top}px`;
    shell.style.inlineSize = `${bounds.width}px`;
    const prompt = document.createElement(
      'cds-aichat-prompt-line'
    ) as PromptLine;
    prompt.slot = 'editor';
    prompt.dataset.testid = `native-autocomplete-prompt-${host}`;
    const native = document.createElement(
      'cds-aichat-native-autocomplete'
    ) as NativeAutocomplete;
    native.contentOwner = autocompleteContent;
    native.promptLine = prompt;
    const borrowed = document.createElement('button');
    borrowed.type = 'button';
    borrowed.textContent = 'Borrowed list';
    borrowed.dataset.testid = 'native-autocomplete-borrowed-list';
    let releaseReady: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseReady = resolve;
    });
    if (!delayReady) {
      releaseReady();
    }
    let labels = ['Alpha', 'Beta'];
    let query = '';
    const probe: NativeAutocompleteProbe = {
      shell,
      prompt,
      native,
      borrowed,
      keys: [],
      selected: [],
      sent: [],
      borrowedClicks: 0,
      query(next) {
        query = next;
        prompt.getEditor()?.commands.setContent(next);
        prompt.dispatchEvent(
          new CustomEvent('cds-aichat-trigger-change', {
            bubbles: true,
            composed: true,
            detail: { type: 'autocomplete', query: next, triggerOffset: 0 },
          })
        );
      },
      releaseReady: () => releaseReady(),
      replaceResults(next) {
        labels = next;
        native.autocomplete = makeConfig();
      },
      clear() {
        prompt.dispatchEvent(
          new CustomEvent('cds-aichat-trigger-change', {
            bubbles: true,
            composed: true,
            detail: null,
          })
        );
      },
      move() {
        shell.appendChild(native);
      },
      detach() {
        native.remove();
      },
      restore() {
        shell.remove();
        originalShells.forEach((element, index) => {
          element.hidden = originalHidden[index];
          element.style.display = originalDisplay[index];
        });
      },
      snapshot() {
        const request = autocompleteContent.getSnapshot().request;
        const state = current.viewState.serviceManager.store.getState();
        return {
          ready: Boolean(request && autocompleteContent.isReady(request)),
          target: request?.target ?? null,
          anchor: request?.anchor ?? null,
          chatHeight: state.chatHeight,
          breakpoint: state.chatWidthBreakpoint,
        };
      },
    };
    function makeConfig(): AutocompleteConfig {
      return {
        items: () => labels.map((label) => ({ id: label, label })),
        disableDirectSend: true,
        ...(kind === 'react'
          ? {
              renderCustomList: (props: CustomListProps) => (
                <ReactList
                  {...props}
                  themeContext={themeContext}
                  probe={probe}
                  gate={gate}
                />
              ),
            }
          : {}),
        ...(kind === 'element' ? { renderCustomList: () => borrowed } : {}),
      };
    }
    borrowed.addEventListener('click', () => {
      probe.borrowedClicks += 1;
    });
    borrowed.addEventListener('keydown', (event) => {
      probe.keys.push(event.key);
    });
    native.autocomplete = makeConfig();
    native.onSelectItem = (item) => {
      probe.selected.push(item.id);
    };
    native.onSendItem = (text) => {
      probe.sent.push(text);
    };
    shell.append(prompt, native);
    container.shadowRoot.append(shell);
    await prompt.updateComplete;
    await prompt.ensureEditor();
    await native.updateComplete;
    probes[host] = probe;
    probe.query(query);
  };
}

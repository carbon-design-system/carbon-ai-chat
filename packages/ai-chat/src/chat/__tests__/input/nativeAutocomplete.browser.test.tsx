/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The prompt line's autocomplete overlay in a real page: where each list
 * kind is slotted, its geometry against the shell row, its height cap, and
 * where focus and keys go, at the demo host page's size. Each case mounts a second prompt-line shell over
 * the chat's own, with a native autocomplete that borrows the chat's
 * autocomplete content owner, so a test can drive trigger changes directly.
 *
 * Internal reads, each because nothing public shows it: the content owner on
 * the chat's own `cds-aichat-native-autocomplete`, its request snapshot (the
 * list's target, anchor and readiness), and the view's `chatHeight` and
 * `chatWidthBreakpoint`, which set the overlay's cap and mode.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Context,
} from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { page, userEvent } from 'vitest/browser';
import type PromptLine from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import type {
  AutocompleteConfig,
  CustomListProps,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/types.js';

import {
  ChatCustomElement,
  type ChatInstance,
  type PublicConfig,
} from '../../../aiChatEntry';
import type NativeAutocomplete from '../../components/input/NativeAutocomplete';
import type { AutocompleteContent } from '../../services/autocompleteContent';
import { chatStore } from '../../services/attachChatView';
import {
  contractElement,
  contractSetup,
  deepActiveElement,
  warmUp,
} from '../helpers/contract';

type Host = 'react' | 'wc';

const HOSTS: Host[] = ['react', 'wc'];

const ThemeContext = createContext('none');

/** The host page's own styles: page content color, and the sized hosts. */
const PAGE_CSS = `
  html, body { height: 100%; margin: 0; }
  .page-styled { color: rgb(1, 2, 3); }
  .sized { display: block; width: 400px; height: 600px; }
`;

interface Probe {
  shell: HTMLElement;
  prompt: PromptLine;
  native: NativeAutocomplete;
  borrowed: HTMLButtonElement;
  keys: string[];
  selected: string[];
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

interface Chat {
  instance: ChatInstance;
  container: HTMLElement;
  /** The element that `outerRoot` holds the list target in. */
  outerRoot: Document | ShadowRoot;
}

const chats: Partial<Record<Host, Chat>> = {};
const probes: Partial<Record<Host, Probe>> = {};
let setTheme: (theme: string) => void = () => undefined;
let pageStyle: HTMLStyleElement | null = null;
let reactView: ReturnType<typeof render> | null = null;

const config = {
  exposeServiceManagerForTesting: true,
  openChatByDefault: true,
  messaging: { skipWelcome: true, customSendMessage: (): void => undefined },
} satisfies PublicConfig;

function ReactHost({ onReady }: { onReady: (chat: ChatInstance) => void }) {
  const [theme, changeTheme] = useState('light');
  setTheme = changeTheme;
  return (
    <ThemeContext.Provider value={theme}>
      <ChatCustomElement
        {...config}
        className="sized"
        onAfterRender={onReady}
      />
    </ThemeContext.Provider>
  );
}

async function mountReactChat(): Promise<Chat> {
  await warmUp();
  let ready: (instance: ChatInstance) => void;
  const rendered = new Promise<ChatInstance>((resolve) => {
    ready = resolve;
  });
  await act(async () => {
    reactView = render(<ReactHost onReady={(chat) => ready(chat)} />);
  });
  const instance = await rendered;
  const container = reactView.container.querySelector<HTMLElement>(
    'cds-aichat-container'
  );
  return { instance, container, outerRoot: document };
}

async function mountWebComponentChat(): Promise<Chat> {
  const { instance, element } = await contractElement(
    'cds-aichat-custom-element',
    { properties: config, attributes: { class: 'sized' } }
  );
  const outerRoot = element.shadowRoot;
  const container = outerRoot.querySelector<HTMLElement>(
    'cds-aichat-container'
  );
  return { instance, container, outerRoot };
}

/** Loads the page styles, sizes the page, and mounts the named chats. */
async function prepare(hosts: Host[], width = 760) {
  pageStyle = document.createElement('style');
  pageStyle.textContent = PAGE_CSS;
  document.head.appendChild(pageStyle);
  await page.viewport(1200, 900);
  for (const host of hosts) {
    chats[host] =
      host === 'react' ? await mountReactChat() : await mountWebComponentChat();
    await waitFor(() =>
      expect(
        chatStore(chats[host].instance.serviceManager).getState().view
          .initialViewChangeComplete
      ).toBe(true)
    );
    await waitFor(() =>
      expect(
        chats[host].container.shadowRoot.querySelector(
          'cds-aichat-prompt-line-shell'
        )
      ).not.toBeNull()
    );
  }
  document.querySelectorAll<HTMLElement>('.sized').forEach((element) => {
    element.style.width = `${width}px`;
  });
}

interface ListProps extends CustomListProps {
  themeContext: Context<string>;
  probe: Probe;
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
      ref={(element: HTMLElement | null) => {
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

/**
 * Hides the chat's own prompt-line shell and mounts a second one at its
 * place, with a prompt line and a native autocomplete of `kind` that borrows
 * the chat's autocomplete content owner.
 */
async function mount(
  host: Host,
  kind: 'builtin' | 'react' | 'element',
  delayReady = false
) {
  probes[host]?.restore();
  const { container, instance } = chats[host];
  const root = container.shadowRoot;
  await customElements.whenDefined('cds-aichat-native-autocomplete');
  const contentOwner = root.querySelector<NativeAutocomplete>(
    'cds-aichat-native-autocomplete'
  ).contentOwner as AutocompleteContent;
  const originalShells = Array.from(
    root.querySelectorAll<HTMLElement>('cds-aichat-prompt-line-shell')
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
  const prompt = document.createElement('cds-aichat-prompt-line') as PromptLine;
  prompt.slot = 'editor';
  prompt.dataset.testid = `native-autocomplete-prompt-${host}`;
  const native = document.createElement(
    'cds-aichat-native-autocomplete'
  ) as NativeAutocomplete;
  native.contentOwner = contentOwner;
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
  const probe: Probe = {
    shell,
    prompt,
    native,
    borrowed,
    keys: [],
    selected: [],
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
      const request = contentOwner.getSnapshot().request;
      const { view } = chatStore(instance.serviceManager).getState();
      return {
        ready: Boolean(request && contentOwner.isReady(request)),
        target: request?.target ?? null,
        anchor: request?.anchor ?? null,
        chatHeight: view.chatHeight,
        breakpoint: view.chatWidthBreakpoint,
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
                themeContext={ThemeContext}
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
  native.onSendItem = () => undefined;
  shell.append(prompt, native);
  root.append(shell);
  await prompt.updateComplete;
  await prompt.ensureEditor();
  await native.updateComplete;
  probes[host] = probe;
  act(() => probe.query(query));
  await waitFor(() => expect(editorOf(host)).not.toBeNull());
  await waitFor(() => expect(isVisible(editorOf(host))).toBe(true));
}

/** The second shell's ProseMirror editor. */
function editorOf(host: Host): HTMLElement | null {
  return (
    probes[host]?.prompt.querySelector<HTMLElement>('.ProseMirror') ?? null
  );
}

function byTestIdDeep(testId: string): HTMLElement[] {
  const found: HTMLElement[] = [];
  const visit = (root: ParentNode) => {
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (element.dataset?.testid === testId) {
        found.push(element);
      }
      if (element.shadowRoot) {
        visit(element.shadowRoot);
      }
    });
  };
  visit(document);
  return found;
}

function list(testId: string): HTMLElement | null {
  return byTestIdDeep(testId)[0] ?? null;
}

function buttonNamed(root: Element | null, name: string) {
  return (
    Array.from(root?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (button) => button.textContent.trim() === name
    ) ?? null
  );
}

/** Shown the way a user sees it: rendered, styled visible, and not empty. */
function isVisible(element: Element | null | undefined): boolean {
  if (!element?.isConnected) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return (
    element.checkVisibility({ visibilityProperty: true }) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

async function press(key: string) {
  await userEvent.keyboard(key);
}

/** Focuses the second shell's editor the way a keyboard user would land. */
function focusEditor(host: Host) {
  act(() => editorOf(host).focus());
}

function expectReactListPlacement(host: Host) {
  const probe = probes[host];
  const { target, anchor } = probe.snapshot();
  const nativeRoot = probe.native.getRootNode() as ShadowRoot;
  const container = nativeRoot.host;
  const reactList = target.firstElementChild;
  const { outerRoot } = chats[host];
  const pageReference = document.createElement('div');
  pageReference.className = 'page-styled';
  document.body.appendChild(pageReference);
  try {
    expect(
      target.parentElement === container &&
        target.getRootNode() === outerRoot &&
        reactList.getRootNode() === outerRoot &&
        anchor.getRootNode() === nativeRoot &&
        target.assignedSlot?.parentElement === anchor
    ).toBe(true);
    const color = getComputedStyle(reactList).color;
    const pageColor = getComputedStyle(pageReference).color;
    expect(pageColor).toBe('rgb(1, 2, 3)');
    if (host === 'react') {
      expect(color).toBe(pageColor);
    } else {
      expect(color).toBe(getComputedStyle(target).color);
      expect(color).not.toBe(pageColor);
    }
  } finally {
    pageReference.remove();
  }
}

contractSetup();

afterEach(async () => {
  Object.values(probes).forEach((probe) => probe?.restore());
  for (const key of Object.keys(probes) as Host[]) {
    delete probes[key];
  }
  reactView?.unmount();
  reactView = null;
  for (const key of Object.keys(chats) as Host[]) {
    delete chats[key];
  }
  pageStyle?.remove();
  setTheme = () => undefined;
  await page.viewport(800, 600);
});

describe.each(HOSTS)('%s native autocomplete', (host) => {
  it(`${host} waits for React list commit and retains its tree through queries and root replacement`, async () => {
    await prepare([host]);
    await mount(host, 'react', true);
    const probe = probes[host];
    const reactList = () => list('native-autocomplete-react-list');
    await waitFor(() => expect(isVisible(reactList())).toBe(true));
    focusEditor(host);
    await press('{ArrowDown}');
    expect(probe.keys).toEqual([]);
    expect(probe.snapshot().ready).toBe(false);
    act(() => probe.releaseReady());
    await waitFor(() => expect(probe.snapshot().ready).toBe(true));
    await press('{ArrowDown}');
    await waitFor(() => expect(probe.keys).toEqual(['ArrowDown']));
    const theme = host === 'react' ? 'light' : 'none';
    await userEvent.click(buttonNamed(reactList(), `${theme}:0`));
    await waitFor(() =>
      expect(isVisible(buttonNamed(reactList(), `${theme}:1`))).toBe(true)
    );
    expect(deepActiveElement()).toBe(editorOf(host));
    expectReactListPlacement(host);
    const target = probe.snapshot().target;
    act(() => probe.query('next'));
    act(() => probe.replaceResults(['Gamma']));
    await waitFor(() =>
      expect(reactList()).toHaveAttribute('data-query', 'next')
    );
    await waitFor(() =>
      expect(isVisible(buttonNamed(reactList(), 'Gamma'))).toBe(true)
    );
    expect(isVisible(buttonNamed(reactList(), `${theme}:1`))).toBe(true);
    expect(probe.snapshot().target).toBe(target);
    if (host === 'react') {
      act(() => setTheme('dark'));
      await waitFor(() =>
        expect(isVisible(buttonNamed(reactList(), 'dark:1'))).toBe(true)
      );
    }
    await userEvent.click(buttonNamed(reactList(), 'Replace list root'));
    await waitFor(() => expect(reactList().tagName).toBe('SECTION'));
    await waitFor(() => expect(probe.snapshot().ready).toBe(true));
    focusEditor(host);
    await press('{ArrowDown}');
    await press('{Enter}');
    await waitFor(() => expect(probe.selected).toEqual(['Gamma']));
    await waitFor(() => expect(reactList()).toBeNull());
    act(() => probe.query('dismiss'));
    await waitFor(() => expect(probe.snapshot().ready).toBe(true));
    await press('{Escape}');
    await waitFor(() => expect(reactList()).toBeNull());
    expect(probe.keys[probe.keys.length - 1]).toBe('Escape');
  });

  describe.each([320, 760])('%spx', (width) => {
    it(`${host} ${width}px custom lists keep direct slots, overlay geometry, and editor focus`, async () => {
      await prepare([host], width);
      for (const kind of ['react', 'element'] as const) {
        await mount(host, kind);
        const probe = probes[host];
        const shown = () =>
          list(
            kind === 'react'
              ? 'native-autocomplete-react-list'
              : 'native-autocomplete-borrowed-list'
          );
        await waitFor(() => expect(isVisible(shown())).toBe(true));
        await waitFor(() => {
          const state = probe.snapshot();
          const { anchor } = state;
          const root =
            kind === 'react'
              ? (state.target?.firstElementChild as HTMLElement)
              : probe.borrowed;
          const row = anchor?.assignedSlot?.parentElement;
          expect(anchor && root && row && state.ready).toBeTruthy();
          const overlay = anchor.getBoundingClientRect();
          const containingRow = row.getBoundingClientRect();
          expect(anchor.parentElement).toBe(probe.shell);
          expect(anchor.assignedSlot.name).toBe('autocomplete-content');
          expect(anchor.hasAttribute('attached')).toBe(false);
          expect(getComputedStyle(anchor).position).toBe('absolute');
          expect(state.breakpoint === 'wide').toBe(width === 760);
          expect(
            Math.abs(overlay.left - (containingRow.left - 8))
          ).toBeLessThan(1);
          expect(
            Math.abs(overlay.width - (containingRow.width + 24))
          ).toBeLessThan(1);
          expect(
            Math.abs(overlay.bottom - (containingRow.top - 8))
          ).toBeLessThan(1);
          expect(
            root.style.getPropertyValue('--cds-aichat-autocomplete-max-height')
          ).toBe(`${Math.floor(state.chatHeight * 0.4)}px`);
          if (kind === 'react') {
            expect(
              Math.abs(root.getBoundingClientRect().width - overlay.width)
            ).toBeLessThan(1);
          }
        });
        if (kind === 'react') {
          expectReactListPlacement(host);
        }
        await userEvent.click(editorOf(host));
        expect(isVisible(shown())).toBe(true);
        await userEvent.click(
          kind === 'react' ? shown().querySelector('button') : shown()
        );
        await waitFor(() => expect(deepActiveElement()).toBe(editorOf(host)));
        await press('{ArrowDown}');
        await waitFor(() => expect(probe.keys).toEqual(['ArrowDown']));
        act(() => probe.clear());
        await waitFor(() => expect(shown()).toBeNull());
      }
    });

    it(`${host} ${width}px builtin list keeps direct slot, height cap, editor anchoring, and dismissal`, async () => {
      await prepare([host], width);
      await mount(host, 'builtin');
      const probe = probes[host];
      const builtin = () =>
        probe.shell.querySelector<HTMLElement>('cds-aichat-autocomplete');
      await waitFor(() => expect(isVisible(builtin())).toBe(true));
      act(() =>
        probe.replaceResults(
          Array.from({ length: 30 }, (_, index) => `Result ${index + 1}`)
        )
      );
      await waitFor(() =>
        expect(
          builtin().shadowRoot.querySelectorAll('[role="option"]')
        ).toHaveLength(30)
      );
      expect(builtin()).toHaveAttribute('slot', 'autocomplete-content');
      await waitFor(() => {
        const state = probe.snapshot();
        expect({
          direct: builtin()?.parentElement === probe.shell,
          assigned: Boolean(builtin()?.assignedSlot),
          attached: builtin()?.hasAttribute('attached'),
          wide: state.breakpoint === 'wide',
        }).toEqual({
          direct: true,
          assigned: true,
          attached: width !== 760,
          wide: width === 760,
        });
      });
      expect(
        builtin().style.getPropertyValue('--cds-aichat-autocomplete-max-height')
      ).toBe(`${Math.floor(probe.snapshot().chatHeight * 0.4)}px`);
      await waitFor(() => {
        const listbox =
          builtin().shadowRoot.querySelector<HTMLElement>('[role="listbox"]');
        expect(listbox.clientHeight).toBeGreaterThan(0);
        expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
        expect(listbox.getBoundingClientRect().height).toBeLessThanOrEqual(
          Math.floor(probe.snapshot().chatHeight * 0.4)
        );
      });
      await userEvent.click(editorOf(host));
      expect(isVisible(builtin())).toBe(true);
      act(() => {
        builtin().dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        );
      });
      expect(deepActiveElement()).toBe(editorOf(host));
      await press('{ArrowDown}');
      await waitFor(() => expect(probe.native.listNavigated).toBe(true));
      await press('{Escape}');
      await waitFor(() => expect(builtin()).toBeNull());
      act(() => probe.query('again'));
      await waitFor(() => expect(isVisible(builtin())).toBe(true));
      await userEvent.click(document.body, { position: { x: 1100, y: 850 } });
      await waitFor(() => expect(builtin()).toBeNull());
    });
  });

  it(`${host} borrows an element directly and retires late readiness after clear and detach`, async () => {
    await prepare([host]);
    await mount(host, 'element');
    const probe = probes[host];
    const borrowedList = () => list('native-autocomplete-borrowed-list');
    await waitFor(() => expect(isVisible(borrowedList())).toBe(true));
    const state = probe.snapshot();
    expect(
      probe.borrowed === state.anchor?.firstElementChild &&
        probe.borrowed.getRootNode() === probe.native.getRootNode() &&
        state.anchor.parentElement === probe.shell &&
        Boolean(state.anchor.assignedSlot) &&
        !state.anchor.hasAttribute('attached')
    ).toBe(true);
    await userEvent.click(borrowedList());
    expect(probe.borrowedClicks).toBe(1);
    act(() => probe.move());
    await waitFor(() => expect(isVisible(borrowedList())).toBe(true));
    act(() => probe.clear());
    await waitFor(() => expect(borrowedList()).toBeNull());
    act(() => probe.query('borrowed again'));
    await waitFor(() => expect(isVisible(borrowedList())).toBe(true));
    act(() => {
      document.body.appendChild(probe.borrowed);
      probe.replaceResults(['Adopted']);
    });
    await waitFor(() =>
      expect(probe.borrowed.parentElement).toBe(document.body)
    );
    act(() => probe.clear());
    expect(probe.borrowed.parentElement).toBe(document.body);
    await mount(host, 'react', true);
    const reactList = () => list('native-autocomplete-react-list');
    await waitFor(() => expect(isVisible(reactList())).toBe(true));
    const delayed = probes[host];
    act(() => {
      delayed.detach();
      delayed.releaseReady();
    });
    await waitFor(() => expect(reactList()).toBeNull());
    await waitFor(() => expect(delayed.snapshot().ready).toBe(false));
  });
});

it('two chats keep separate custom-list targets and keyboard listeners', async () => {
  await prepare(['react', 'wc'], 400);
  await mount('react', 'react');
  await mount('wc', 'react');
  await waitFor(() =>
    expect(byTestIdDeep('native-autocomplete-react-list')).toHaveLength(2)
  );
  await waitFor(() =>
    expect(HOSTS.every((each) => probes[each].snapshot().ready)).toBe(true)
  );
  focusEditor('react');
  await press('{ArrowDown}');
  expect({
    react: probes.react.keys,
    wc: probes.wc.keys,
    separate: probes.react.snapshot().target !== probes.wc.snapshot().target,
  }).toEqual({ react: ['ArrowDown'], wc: [], separate: true });
  act(() => probes.react.detach());
  await waitFor(() =>
    expect(byTestIdDeep('native-autocomplete-react-list')).toHaveLength(1)
  );
  expect(
    isVisible(
      buttonNamed(byTestIdDeep('native-autocomplete-react-list')[0], 'none:0')
    )
  ).toBe(true);
});

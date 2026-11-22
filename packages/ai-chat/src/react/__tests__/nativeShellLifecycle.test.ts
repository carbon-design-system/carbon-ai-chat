// @vitest-environment jsdom
// Shell detach and reconnect bindings differ under happy-dom 21; cause not isolated.
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import ChatShell from '../../chat/components/shell/ChatShell';
import type ChatInput from '../../chat/components/input/ChatInput';
import type { ChatMountState } from '../../chat/services/chatMountState';
import { ChatContainer } from '../ChatContainer';
import { ChatCustomElement } from '../ChatCustomElement';
import * as resizeLifecycle from '../../chat/utils/resizeObserver';
import * as mobileLifecycle from '../../chat/utils/mobileViewportLayout';
import * as writablePresence from '../../chat/utils/writeableElementPresence';
import * as selectedSubscriptions from '../../chat/utils/selectedSubscription';
import * as styleInjection from '../../chat/utils/styleInjection';
import { ShellLifecycle } from '../../chat/utils/shellLifecycle';
import type { WindowOpenState } from '../../chat/services/windowOpenState';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type { ChatContainerProps } from '../../types/component/ChatContainer';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { viewActions } from '../../chat/state';

const restoreWindow: (() => void)[] = [];

function patchWindow<K extends keyof Window & string>(
  name: K,
  value: Window[K]
): void {
  const descriptor = Object.getOwnPropertyDescriptor(window, name);
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value,
  });
  restoreWindow.push(() => {
    if (descriptor) {
      Object.defineProperty(window, name, descriptor);
    } else {
      delete window[name];
    }
  });
}

type ShellOwner = ChatShell | ShellLifecycle;
type Method = (...args: unknown[]) => unknown;

/**
 * Wraps every point where the shell acquires a resource. Each wrapper calls
 * through to the real code. A resource counts as owned by whichever shell
 * element or lifecycle was running when it was acquired, and stays active
 * until its own release path runs.
 */
function trackShellResources() {
  let current: ShellOwner | undefined;
  const lifecycles: ShellLifecycle[] = [];
  const resources: { owner: ShellOwner; kind: string; active: boolean }[] = [];
  const releases = new Map<ShellOwner, (() => void)[]>();
  const listeners: {
    record: (typeof resources)[number];
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    capture: boolean;
  }[] = [];
  const frames = new Map<number, (typeof resources)[number]>();
  const timers = new Map<unknown, (typeof resources)[number]>();

  function within<T>(owner: ShellOwner | undefined, run: () => T): T {
    const previous = current;
    current = owner;
    try {
      return run();
    } finally {
      current = previous;
    }
  }
  function acquire(kind: string) {
    if (!current) {
      return undefined;
    }
    const record = { owner: current, kind, active: true };
    resources.push(record);
    return record;
  }
  function tracked(kind: string, release: () => void): () => void {
    const record = acquire(kind);
    if (!record) {
      return release;
    }
    const wrapped = () => {
      record.active = false;
      release();
    };
    releases.set(record.owner, [
      ...(releases.get(record.owner) ?? []),
      wrapped,
    ]);
    return wrapped;
  }
  function scoped(prototype: object, name: string, onEnter?: Method) {
    const methods = prototype as Record<string, Method>;
    const original = methods[name];
    vi.spyOn(methods, name).mockImplementation(function (
      this: ShellOwner,
      ...args: unknown[]
    ) {
      onEnter?.call(this);
      return within(this, () => original.apply(this, args));
    });
  }

  scoped(ChatShell.prototype, 'onViewConnected');
  scoped(ChatShell.prototype, 'renderFailedView');
  scoped(ShellLifecycle.prototype, 'update');
  scoped(ShellLifecycle.prototype, 'attach');
  scoped(ShellLifecycle.prototype, 'connect', function (this: ShellOwner) {
    const lifecycle = this as ShellLifecycle;
    if (lifecycles.includes(lifecycle)) {
      return;
    }
    lifecycles.push(lifecycle);
    const windowState = (lifecycle as unknown as { window: WindowOpenState })
      .window;
    const subscribe = windowState.subscribe;
    vi.spyOn(windowState, 'subscribe').mockImplementation((listener) =>
      tracked('subscription:window', subscribe(listener))
    );
  });

  const subscribe = selectedSubscriptions.subscribeToSelectedValue;
  vi.spyOn(
    selectedSubscriptions,
    'subscribeToSelectedValue'
  ).mockImplementation((...args) =>
    tracked('subscription', subscribe(...args))
  );
  const observeResize = resizeLifecycle.observeResize;
  vi.spyOn(resizeLifecycle, 'observeResize').mockImplementation((...args) =>
    tracked('observer:resize', observeResize(...args))
  );
  const observePresence = writablePresence.observeWriteableElementPresence;
  vi.spyOn(
    writablePresence,
    'observeWriteableElementPresence'
  ).mockImplementation((node, onChange) => {
    // Presence changes arrive later from a MutationObserver. Run them as
    // the owner so anything they acquire is attributed too.
    const owner = current;
    return tracked(
      'observer:writable',
      observePresence(node, (present) => within(owner, () => onChange(present)))
    );
  });
  const connectMobile = mobileLifecycle.connectMobileViewportLayout;
  vi.spyOn(mobileLifecycle, 'connectMobileViewportLayout').mockImplementation(
    (...args) => tracked('binding:mobile', connectMobile(...args))
  );

  const capture = (options?: boolean | EventListenerOptions) =>
    typeof options === 'boolean' ? options : Boolean(options?.capture);
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(
    function (this: EventTarget, type, listener, options) {
      const record = listener && acquire(`listener:${type}`);
      if (record) {
        listeners.push({
          record,
          target: this,
          type,
          listener,
          capture: capture(options),
        });
      }
      add.call(this, type, listener, options);
    }
  );
  vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(
    function (this: EventTarget, type, listener, options) {
      for (const entry of listeners) {
        if (
          entry.target === this &&
          entry.type === type &&
          entry.listener === listener &&
          entry.capture === capture(options)
        ) {
          entry.record.active = false;
        }
      }
      remove.call(this, type, listener, options);
    }
  );

  // Timers are patched with plain functions, not Jest mocks, so Testing
  // Library keeps treating timers as real. afterEach restores them.
  const requestFrame = window.requestAnimationFrame;
  const cancelFrame = window.cancelAnimationFrame;
  patchWindow('requestAnimationFrame', (callback) => {
    const record = acquire('frame');
    const id = requestFrame.call(window, (time: number) => {
      if (record) {
        record.active = false;
      }
      callback(time);
    });
    if (record) {
      frames.set(id, record);
    }
    return id;
  });
  patchWindow('cancelAnimationFrame', (id) => {
    const record = frames.get(id);
    if (record) {
      record.active = false;
    }
    cancelFrame.call(window, id);
  });
  const startTimer = window.setTimeout;
  const clearTimer = window.clearTimeout;
  patchWindow('setTimeout', ((
    callback: (...values: unknown[]) => void,
    delay?: number,
    ...values: unknown[]
  ) => {
    const record = acquire('timer');
    const id = (startTimer as (...timerArgs: unknown[]) => number).call(
      window,
      (...callbackValues: unknown[]) => {
        if (record) {
          record.active = false;
        }
        callback(...callbackValues);
      },
      delay,
      ...values
    );
    if (record) {
      timers.set(id, record);
    }
    return id;
  }) as typeof window.setTimeout);
  patchWindow('clearTimeout', ((id?: number) => {
    const record = timers.get(id);
    if (record) {
      record.active = false;
    }
    clearTimer.call(window, id);
  }) as typeof window.clearTimeout);

  return {
    lifecycles,
    /** Kinds of every resource the given owners still hold, sorted. */
    active(...owners: ShellOwner[]): string[] {
      return resources
        .filter((record) => record.active && owners.includes(record.owner))
        .map((record) => record.kind)
        .sort();
    },
    /** The tracked release functions an owner received, for stale replays. */
    releasesOf(owner: ShellOwner): (() => void)[] {
      return [...(releases.get(owner) ?? [])];
    },
  };
}

async function boot(
  Wrapper: typeof ChatContainer | typeof ChatCustomElement = ChatContainer,
  props: Partial<ChatContainerProps> = {}
) {
  let instance: ChatInstance;
  const after = vi.fn();
  const mounted = render(
    React.createElement(Wrapper, {
      ...createBaseConfig(),
      openChatByDefault: true,
      shouldTakeFocusIfOpensAutomatically: false,
      homescreen: { isOn: false },
      ...props,
      onBeforeRender: (chat) => {
        instance = chat;
        props.onBeforeRender?.(chat);
      },
      onAfterRender: after,
    })
  );
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  const { viewState } = view as unknown as { viewState: ChatMountState };
  const manager = viewState.serviceManager;
  return { instance, root, view, mounted, manager, viewState };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  restoreWindow
    .splice(0)
    .reverse()
    .forEach((restore) => restore());
  setupAfterEach();
  // A test that closes the view persists that state. Clear it so later
  // tests boot open even when an earlier one failed partway.
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const SHELL_RESOURCES = [
  'listener:focusin',
  'listener:keydown',
  'listener:slotchange',
  'observer:resize',
  'observer:writable',
  'subscription',
  'subscription:window',
];

// What a failed shell's error view still holds: its own store subscription
// plus the window, style, resize and listener work that keeps it styled.
const FAILED_VIEW_RESOURCES = [
  'binding:mobile',
  'listener:focusin',
  'listener:keydown',
  'listener:slotchange',
  'observer:resize',
  'observer:writable',
  'subscription',
  'subscription:window',
];

function registrations(viewState: ChatMountState) {
  return {
    appWindow: viewState.appWindow,
    mainWindow: viewState.mainWindow,
    inputComponent: viewState.inputComponent,
    ariaAnnouncer: viewState.ariaAnnouncer,
  };
}

function expectNoRegistrations(viewState: ChatMountState) {
  expect(viewState.appWindow).toBeUndefined();
  expect(viewState.mainWindow).toBeUndefined();
  expect(viewState.inputComponent).toBeNull();
  expect(viewState.ariaAnnouncer).toBeUndefined();
}

async function detach(view: ChatShell) {
  await act(async () => {
    view.remove();
    // The shell releases its owner in a microtask after disconnect.
    await Promise.resolve();
  });
}

it('releases every shell resource and registration on each real detach and reconnects one live owner', async () => {
  const tracker = trackShellResources();
  const f = await boot();
  const parent = f.view.parentNode;
  expect(tracker.lifecycles).toHaveLength(1);
  const [first] = tracker.lifecycles;
  expect(tracker.active(f.view, first)).toEqual(
    expect.arrayContaining(SHELL_RESOURCES)
  );
  expect(f.viewState.mainWindow).toBe(first.mainWindow);
  expect(f.viewState.inputComponent).toBeTruthy();
  const firstViewReleases = tracker.releasesOf(f.view);

  await detach(f.view);
  expect(tracker.active(f.view, first)).toEqual([]);
  expectNoRegistrations(f.viewState);

  act(() => {
    parent.appendChild(f.view);
  });
  await expect(f.view.whenReady()).resolves.toBe(true);
  expect(tracker.lifecycles).toHaveLength(2);
  const [, second] = tracker.lifecycles;
  expect(tracker.active(first)).toEqual([]);
  const live = tracker.active(f.view, second);
  expect(live).toEqual(expect.arrayContaining(SHELL_RESOURCES));
  const current = registrations(f.viewState);
  expect(current.mainWindow).toBe(second.mainWindow);
  expect(current.inputComponent).toBe(
    f.view.querySelector<ChatInput>('cds-aichat-chat-input').inputFunctions
  );
  expect(current.ariaAnnouncer).toEqual(expect.any(Function));

  // Late releases from the first owner leave the second owner intact.
  [...firstViewReleases, ...tracker.releasesOf(first)].forEach((release) =>
    release()
  );
  first.disconnect();
  expect(registrations(f.viewState)).toEqual(current);
  expect(tracker.active(f.view, second)).toEqual(live);

  // Detach again while the close animation still holds its listener and
  // fallback timer.
  await act(async () => {
    await f.instance.changeView({ mainWindow: false, launcher: true });
  });
  expect(tracker.active(second)).toEqual(
    expect.arrayContaining(['listener:animationend', 'timer'])
  );
  await detach(f.view);
  expect(tracker.active(f.view, first, second)).toEqual([]);
  expectNoRegistrations(f.viewState);
  expect(tracker.lifecycles).toHaveLength(2);
  act(() => {
    parent.appendChild(f.view);
  });
});

it('keeps a replacement shell live when the stale shell detaches after it connects', async () => {
  const tracker = trackShellResources();
  const f = await boot();
  const parent = f.view.parentNode;
  const [stale] = tracker.lifecycles;
  const staleReleases = [
    ...tracker.releasesOf(f.view),
    ...tracker.releasesOf(stale),
  ];
  const replacement = document.createElement('cds-aichat-chat-shell');
  replacement.options = f.view.options;
  replacement.inputConfig = f.view.inputConfig;
  replacement.transformIcon = f.view.transformIcon;
  replacement.contentRevision = f.view.contentRevision;
  act(() => {
    parent.insertBefore(replacement, f.view.nextSibling);
  });
  await waitFor(() => {
    const input = replacement.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(input?.inputFunctions).toBeTruthy();
    expect(f.viewState.inputComponent).toBe(input.inputFunctions);
  });
  expect(tracker.lifecycles).toHaveLength(2);
  const [, fresh] = tracker.lifecycles;
  const live = registrations(f.viewState);
  expect(live.mainWindow).toBe(fresh.mainWindow);
  expect(live.mainWindow).not.toBe(stale.mainWindow);
  expect(live.appWindow?.requestFocus).toEqual(expect.any(Function));
  expect(live.ariaAnnouncer).toEqual(expect.any(Function));
  const freshResources = tracker.active(replacement, fresh);
  expect(freshResources).toEqual(expect.arrayContaining(SHELL_RESOURCES));

  // The stale shell's own deferred disconnect runs after the replacement
  // published its handles. Its releases then run once more.
  await detach(f.view);
  expect(tracker.active(f.view, stale)).toEqual([]);
  staleReleases.forEach((release) => release());
  stale.disconnect();
  expect(registrations(f.viewState)).toEqual(live);
  expect(f.viewState.ariaAnnouncer).toBe(live.ariaAnnouncer);
  expect(tracker.active(replacement, fresh)).toEqual(freshResources);
  expect(tracker.lifecycles).toHaveLength(2);

  await detach(replacement);
  expect(tracker.active(replacement, fresh)).toEqual([]);
  expectNoRegistrations(f.viewState);
  act(() => {
    parent.appendChild(f.view);
  });
});

it('releases the failed shell error view and its live bindings on a real detach', async () => {
  const tracker = trackShellResources();
  const onError = vi.fn();
  const f = await boot(ChatContainer, { onError });
  const parent = f.view.parentNode;
  vi.spyOn(f.view as any, 'renderView').mockImplementationOnce(() => {
    throw new Error('Native shell failed');
  });
  act(() => {
    f.view.requestUpdate();
  });
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  await f.view.updateComplete;
  // The failure releases this owner's handles. The error view keeps its
  // store subscription and the window, style, resize and listener work that
  // keeps it styled and following the window state.
  expect(tracker.active(f.view, ...tracker.lifecycles)).toEqual(
    FAILED_VIEW_RESOURCES
  );
  expectNoRegistrations(f.viewState);

  await detach(f.view);
  expect(tracker.active(f.view, ...tracker.lifecycles)).toEqual([]);
  act(() => {
    parent.appendChild(f.view);
  });
});

function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** Whether `node` sits inside `container`, crossing shadow roots. */
function composedWithin(container: Node | null, node: Node | null): boolean {
  let current = node;
  while (current && container) {
    if (current === container) {
      return true;
    }
    current =
      current.parentNode instanceof ShadowRoot
        ? current.parentNode.host
        : current.parentNode;
  }
  return false;
}

async function expectLiveInputRegistration(f: {
  view: ChatShell;
  viewState: ChatMountState;
}) {
  const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
  await waitFor(() => expect(f.viewState.inputComponent).toBeTruthy());
  expect(f.viewState.inputComponent).toBe(input.inputFunctions);
  act(() => {
    (deepActiveElement() as HTMLElement | null)?.blur();
  });
  expect(composedWithin(input, deepActiveElement())).toBe(false);
  // The chat's own focus route reaches the input through the registration.
  act(() => {
    f.viewState.mainWindow.requestFocus();
  });
  await waitFor(() =>
    expect(composedWithin(input, deepActiveElement())).toBe(true)
  );
}

// ChatCustomElement does not rebuild its chat after an Activity show, on
// main as well, so this case runs through ChatContainer only.
it('restores the input registration when an Activity boundary hides and shows the ChatContainer chat', async () => {
  let setMode: (mode: 'visible' | 'hidden') => void;
  const after = vi.fn();
  function Host() {
    const [mode, update] = React.useState<'visible' | 'hidden'>('visible');
    setMode = update;
    return React.createElement(
      React.Activity,
      { mode } as React.ActivityProps,
      React.createElement(ChatContainer, {
        ...createBaseConfig(),
        openChatByDefault: true,
        shouldTakeFocusIfOpensAutomatically: true,
        homescreen: { isOn: false },
        onAfterRender: after,
      })
    );
  }
  render(React.createElement(Host));
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const currentShell = () => {
    const view = document
      .querySelector('cds-aichat-container')
      .shadowRoot.querySelector<ChatShell>('cds-aichat-chat-shell');
    const { viewState } = view as unknown as { viewState: ChatMountState };
    return { view, viewState, manager: viewState?.serviceManager };
  };
  const before = currentShell();
  await before.view.whenReady();
  expect(before.viewState.inputComponent).toBeTruthy();

  const handle = before.viewState.inputComponent;
  act(() => {
    setMode('hidden');
  });
  // Hidden content keeps the input rendered, so its one handle stays
  // published and the public input API still reaches it.
  expect(before.viewState.inputComponent).toBe(handle);
  expect(before.manager.view.current.instance.input()).toBe(handle);
  expect(before.viewState.mainWindow).toBeUndefined();
  // The shell updates while hidden, as when a stream ends there.
  await act(async () => {
    before.view.requestUpdate();
    await before.view.updateComplete;
  });
  const dispatch = vi.spyOn(before.manager.store, 'dispatch');
  act(() => {
    setMode('visible');
  });
  await waitFor(() => expect(currentShell().manager).toBeTruthy());
  const shown = currentShell();
  await shown.view.updateComplete;
  const widget = shown.view.querySelector<HTMLElement>('cds-aichat-shell');
  expect(dispatch).toHaveBeenCalledWith(
    viewActions.setViewValue('chatWidth', widget.offsetWidth)
  );
  await expectLiveInputRegistration(shown);
});

it('delivers content created while an Activity boundary hides the ChatContainer chat', async () => {
  let setMode: (mode: 'visible' | 'hidden') => void;
  let instance: ChatInstance;
  const after = vi.fn((chat: ChatInstance) => {
    instance = chat;
  });
  function Host() {
    const [mode, update] = React.useState<'visible' | 'hidden'>('visible');
    setMode = update;
    return React.createElement(
      React.Activity,
      { mode } as React.ActivityProps,
      React.createElement(ChatContainer, {
        ...createBaseConfig(),
        openChatByDefault: true,
        shouldTakeFocusIfOpensAutomatically: false,
        homescreen: { isOn: true, greeting: 'Welcome' },
        onAfterRender: after,
      })
    );
  }
  render(React.createElement(Host));
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const view = document
    .querySelector('cds-aichat-container')
    .shadowRoot.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  expect(view.querySelector('cds-aichat-home-screen')).not.toBeNull();

  act(() => {
    setMode('hidden');
  });
  // Sending closes the home screen, so the shell makes a new message target
  // and new panel inputs while React content is detached.
  await act(async () => {
    await instance.send('Sent while hidden');
    await view.updateComplete;
  });
  act(() => {
    setMode('visible');
  });

  const ready = vi.fn();
  void view.whenReady().then(ready);
  await waitFor(() => expect(ready).toHaveBeenCalledWith(true));
  // Message text renders inside nested shadow roots, so read it composed.
  const composedText = (node: Node): string =>
    Array.from(node.childNodes, (child) => composedText(child)).join('') +
    (node instanceof Element && node.shadowRoot
      ? composedText(node.shadowRoot)
      : '') +
    (node.nodeType === Node.TEXT_NODE ? node.textContent : '');
  await waitFor(() =>
    expect(
      composedText(view.querySelector('.cds-aichat--shell-messages-target'))
    ).toContain('Sent while hidden')
  );
});

it('shows error panel content configured while an Activity boundary hides a failed ChatContainer chat', async () => {
  let setMode: (mode: 'visible' | 'hidden') => void;
  let instance: ChatInstance;
  const after = vi.fn((chat: ChatInstance) => {
    instance = chat;
  });
  const onError = vi.fn();
  function Host() {
    const [mode, update] = React.useState<'visible' | 'hidden'>('visible');
    setMode = update;
    return React.createElement(
      React.Activity,
      { mode } as React.ActivityProps,
      React.createElement(ChatContainer, {
        ...createBaseConfig(),
        openChatByDefault: true,
        shouldTakeFocusIfOpensAutomatically: false,
        homescreen: { isOn: false },
        onError,
        onAfterRender: after,
      })
    );
  }
  render(React.createElement(Host));
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const root = document.querySelector('cds-aichat-container').shadowRoot;
  const view = root.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  // React has a live messages list in the shell's target before the hide.
  expect(view.getMessages?.()).not.toBeNull();

  act(() => {
    setMode('hidden');
  });
  // The shell fails and the host configures the error panel while hidden.
  vi.spyOn(view as any, 'renderView').mockImplementationOnce(() => {
    throw new Error('Native shell failed while hidden');
  });
  await act(async () => {
    view.requestUpdate();
    await view.updateComplete;
  });
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  await act(async () => {
    instance.updateCatastrophicErrorPanel({
      isOpen: true,
      title: 'Configured while hidden',
      bodyText: 'The host set this panel while the chat was hidden.',
    });
    await view.updateComplete;
  });
  const inject = vi.spyOn(styleInjection, 'injectStyles');
  act(() => {
    setMode('visible');
  });

  await waitFor(() =>
    expect(
      root.querySelector('.cds-aichat--catastrophic-error__error-heading')
        ?.textContent
    ).toBe('Configured while hidden')
  );
  // The failed view has no messages target, so React must drop its list too.
  await waitFor(() => expect(view.getMessages?.()).toBeNull());
  // The shown error view is styled again but publishes no handles.
  const container = view.querySelector('.cds-aichat--container--render');
  await waitFor(() =>
    expect(
      inject.mock.calls.some(([options]) => options.container === container)
    ).toBe(true)
  );
  expectNoRegistrations(
    (view as unknown as { viewState: ChatMountState }).viewState
  );
});

it('keeps close and reopen focus working after window state stops and starts again', async () => {
  const f = await boot(ChatContainer, {
    shouldTakeFocusIfOpensAutomatically: true,
  });
  await waitFor(() => expect(f.viewState.inputComponent.hasFocus()).toBe(true));
  const widget = f.view.querySelector('cds-aichat-shell');
  // An effect replay without a ref replay, as React 18 StrictMode runs it:
  // the shell's content stays connected throughout.
  act(() => {
    f.view.disconnectWindowState();
    f.view.connectWindowState();
  });
  await act(async () => {
    await f.instance.changeView({ mainWindow: false, launcher: true });
  });
  await waitFor(() =>
    expect(widget.classList.contains('cds-aichat-float--close')).toBe(true)
  );
  act(() => {
    (deepActiveElement() as HTMLElement | null)?.blur();
  });
  expect(f.viewState.inputComponent.hasFocus()).toBe(false);
  await act(async () => {
    await f.instance.changeView({ mainWindow: true, launcher: false });
  });
  await waitFor(() =>
    expect(widget.classList.contains('cds-aichat-float--close')).toBe(false)
  );
  await waitFor(() => expect(f.viewState.inputComponent.hasFocus()).toBe(true));
});

it('stops window state while an Activity boundary hides the ChatContainer chat and starts it on show', async () => {
  let setMode: (mode: 'visible' | 'hidden') => void;
  const after = vi.fn();
  function Host() {
    const [mode, update] = React.useState<'visible' | 'hidden'>('visible');
    setMode = update;
    return React.createElement(
      React.Activity,
      { mode } as React.ActivityProps,
      React.createElement(ChatContainer, {
        ...createBaseConfig(),
        openChatByDefault: true,
        shouldTakeFocusIfOpensAutomatically: false,
        homescreen: { isOn: false },
        onAfterRender: after,
      })
    );
  }
  render(React.createElement(Host));
  await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
    timeout: 5000,
  });
  const view = document
    .querySelector('cds-aichat-container')
    .shadowRoot.querySelector<ChatShell>('cds-aichat-chat-shell');
  await view.whenReady();
  const windowConnected = () =>
    (
      view as unknown as {
        lifecycle?: { window: { connected: boolean } };
      }
    ).lifecycle?.window.connected;
  expect(windowConnected()).toBe(true);
  const connect = vi.spyOn(view, 'connectWindowState');

  act(() => {
    setMode('hidden');
  });
  // The hide drops AppShell's passive effects; window state stops with them.
  expect(windowConnected()).toBe(false);
  act(() => {
    setMode('visible');
  });
  // The show runs them again; the shell's next update connects the window.
  expect(connect).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(windowConnected()).toBe(true));
});

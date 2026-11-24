/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import ChatShell from '../../../src/chat/components/shell/ChatShell';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import type { ChatMountState } from '../../../src/chat/services/chatMountState';
import { useChatMountStateInstance } from '../../../src/chat/hooks/useChatMountState';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import actions from '../../../src/sdk/store/actions';
import * as resizeLifecycle from '../../../src/chat/utils/resizeObserver';
import * as mobileLifecycle from '../../../src/chat/utils/mobileViewportLayout';
import * as writablePresence from '../../../src/chat/utils/writeableElementPresence';
import * as selectedSubscriptions from '../../../src/chat/utils/selectedSubscription';
import * as customPromptLine from '../../../src/chat/utils/customPromptLine';
import * as styleInjection from '../../../src/chat/utils/styleInjection';
import { ShellLifecycle } from '../../../src/chat/utils/shellLifecycle';
import type { WindowOpenState } from '../../../src/chat/services/windowOpenState';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { viewActions } from '../../../src/chat/state';
import { chatStore } from '../../../src/chat/services/attachChatView';

const wrappers = [
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const;

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
    jest.spyOn(methods, name).mockImplementation(function (
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
    jest
      .spyOn(windowState, 'subscribe')
      .mockImplementation((listener) =>
        tracked('subscription:window', subscribe(listener))
      );
  });

  const subscribe = selectedSubscriptions.subscribeToSelectedValue;
  jest
    .spyOn(selectedSubscriptions, 'subscribeToSelectedValue')
    .mockImplementation((...args) =>
      tracked('subscription', subscribe(...args))
    );
  const observeResize = resizeLifecycle.observeResize;
  jest
    .spyOn(resizeLifecycle, 'observeResize')
    .mockImplementation((...args) =>
      tracked('observer:resize', observeResize(...args))
    );
  const observePresence = writablePresence.observeWriteableElementPresence;
  jest
    .spyOn(writablePresence, 'observeWriteableElementPresence')
    .mockImplementation((node, onChange) => {
      // Presence changes arrive later from a MutationObserver. Run them as
      // the owner so anything they acquire is attributed too.
      const owner = current;
      return tracked(
        'observer:writable',
        observePresence(node, (present) =>
          within(owner, () => onChange(present))
        )
      );
    });
  const connectMobile = mobileLifecycle.connectMobileViewportLayout;
  jest
    .spyOn(mobileLifecycle, 'connectMobileViewportLayout')
    .mockImplementation((...args) =>
      tracked('binding:mobile', connectMobile(...args))
    );

  const capture = (options?: boolean | EventListenerOptions) =>
    typeof options === 'boolean' ? options : Boolean(options?.capture);
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  jest
    .spyOn(EventTarget.prototype, 'addEventListener')
    .mockImplementation(function (this: EventTarget, type, listener, options) {
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
    });
  jest
    .spyOn(EventTarget.prototype, 'removeEventListener')
    .mockImplementation(function (this: EventTarget, type, listener, options) {
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
    });

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
  Wrapper: (typeof wrappers)[number][1] = ChatContainer,
  props: Partial<ChatContainerProps> = {}
) {
  let instance: ChatInstance;
  const after = jest.fn();
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
  jest.restoreAllMocks();
});

describe.each(wrappers)(
  'native shell registration through %s',
  (_name, Wrapper) => {
    it('publishes renderer handles before the first consumer passive effect', async () => {
      const seen = jest.fn();
      function Consumer(): React.ReactElement | null {
        const viewState = useChatMountStateInstance();
        useEffect(() => {
          const { appWindow, mainWindow } = viewState;
          seen(appWindow, mainWindow);
        }, [viewState]);
        return null;
      }
      const f = await boot(Wrapper, {
        renderWriteableElements: {
          footerElement: React.createElement(Consumer),
        },
      });
      expect(seen).toHaveBeenCalledTimes(1);
      const [appWindow, mainWindow] = seen.mock.calls[0];
      expect(appWindow?.requestFocus).toEqual(expect.any(Function));
      expect(mainWindow?.requestFocus).toEqual(expect.any(Function));
      expect(mainWindow?.doAutoScroll).toEqual(expect.any(Function));
      expect(mainWindow?.doScrollToMessage).toEqual(expect.any(Function));
      expect(mainWindow?.getMessagesScrollBottom).toEqual(expect.any(Function));
      expect(f.viewState.appWindow).toBe(appWindow);
      expect(f.viewState.mainWindow).toBe(mainWindow);
      f.mounted.unmount();
      expect(f.viewState.appWindow).toBeUndefined();
      expect(f.viewState.mainWindow).toBeUndefined();
    });
  }
);

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
  const onError = jest.fn();
  const f = await boot(ChatContainer, { onError });
  const parent = f.view.parentNode;
  jest.spyOn(f.view as any, 'renderView').mockImplementationOnce(() => {
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

describe.each(wrappers)('composer focus move through %s', (_name, Wrapper) => {
  it.each(['frame', 'readiness wait'] as const)(
    'does nothing after a detach while the %s is pending',
    async (pending) => {
      // Queue frames by hand so the test decides when they run.
      const frames = new Map<number, FrameRequestCallback>();
      let nextFrame = 0;
      patchWindow('requestAnimationFrame', (callback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
      });
      patchWindow('cancelAnimationFrame', (id) => {
        frames.delete(id);
      });
      const runFrames = () => {
        const queued = [...frames.values()];
        frames.clear();
        queued.forEach((callback) => callback(performance.now()));
      };
      const tracker = trackShellResources();
      let hideComposer: () => void;
      function Composer() {
        const [visible, setVisible] = React.useState(true);
        hideComposer = () => setTimeout(() => setVisible(false), 0);
        return visible
          ? React.createElement('input', {
              'aria-label': 'Custom composer',
              'data-testid': 'custom-composer',
            })
          : null;
      }
      const f = await boot(Wrapper, {
        renderWriteableElements: {
          customPromptLine: React.createElement(Composer),
        },
      });
      runFrames();
      const parent = f.view.parentNode;
      const composer = f.instance.writeableElements.customPromptLine
        .firstElementChild as HTMLInputElement;
      act(() => {
        composer.focus();
      });
      expect(document.activeElement).toBe(composer);
      let release: (ready: boolean) => void;
      const blocked = new Promise<boolean>((resolve) => {
        release = resolve;
      });
      const readiness = jest
        .spyOn(f.view, 'whenReady')
        .mockReturnValue(blocked);
      const requestFocus = jest.spyOn(customPromptLine, 'requestComposerFocus');

      hideComposer();
      await waitFor(() =>
        expect(f.view.querySelector('cds-aichat-chat-input')).not.toBeNull()
      );
      await f.view.updateComplete;
      expect(frames.size).toBeGreaterThan(0);
      if (pending === 'readiness wait') {
        runFrames();
        expect(readiness).toHaveBeenCalled();
      }
      await detach(f.view);
      // The detach itself releases the pending frame.
      expect(tracker.active(f.view, ...tracker.lifecycles)).toEqual([]);
      runFrames();
      await act(async () => {
        release(true);
        await blocked;
      });
      expect(requestFocus).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(document.body);
      expect(tracker.active(f.view, ...tracker.lifecycles)).toEqual([]);
      act(() => {
        parent.appendChild(f.view);
      });
    }
  );
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

describe.each(wrappers)('content re-attach through %s', (_name, Wrapper) => {
  it('re-acquires resize, mobile and keyboard bindings after the shell updates while React content is detached', async () => {
    const tracker = trackShellResources();
    const f = await boot(Wrapper);
    const [lifecycle] = tracker.lifecycles;
    const count = (kind: string) =>
      tracker.active(f.view, lifecycle).filter((active) => active === kind)
        .length;
    for (const kind of [
      'observer:resize',
      'binding:mobile',
      'listener:keydown',
    ]) {
      expect(count(kind)).toBe(1);
    }

    act(() => {
      f.view.setContentConnected(false);
    });
    expect(tracker.active(lifecycle)).toEqual([]);
    // A shell update while detached, as when a stream ends inside a hidden
    // Activity, attaches the same targets to the disconnected lifecycle.
    await act(async () => {
      f.view.requestUpdate();
      await f.view.updateComplete;
    });
    const dispatch = jest.spyOn(f.manager.store, 'dispatch');
    act(() => {
      f.view.setContentConnected(true);
    });
    await f.view.updateComplete;

    for (const kind of [
      'observer:resize',
      'binding:mobile',
      'listener:keydown',
    ]) {
      expect(count(kind)).toBe(1);
    }
    const widget = f.view.querySelector<HTMLElement>('cds-aichat-shell');
    expect(dispatch).toHaveBeenCalledWith(
      viewActions.setViewValue('chatWidth', widget.offsetWidth)
    );
  });

  it('restores the input registration when React detaches and re-attaches the shell', async () => {
    const f = await boot(Wrapper, {
      shouldTakeFocusIfOpensAutomatically: true,
    });
    const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
    expect(f.viewState.inputComponent).toBe(input.inputFunctions);

    act(() => {
      f.view.setContentConnected(false);
    });
    // The input stays rendered, so its one handle stays published.
    expect(f.viewState.inputComponent).toBe(input.inputFunctions);
    act(() => {
      f.view.setContentConnected(true);
    });
    await f.view.updateComplete;
    expect(f.view.querySelector('cds-aichat-chat-input')).toBe(input);
    await expectLiveInputRegistration(f);
  });
});

// ChatCustomElement does not rebuild its chat after an Activity show, on
// main as well, so this case runs through ChatContainer only.
it('restores the input registration when an Activity boundary hides and shows the ChatContainer chat', async () => {
  let setMode: (mode: 'visible' | 'hidden') => void;
  const after = jest.fn();
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
  const dispatch = jest.spyOn(before.manager.store, 'dispatch');
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
  const after = jest.fn((chat: ChatInstance) => {
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

  const ready = jest.fn();
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
  const after = jest.fn((chat: ChatInstance) => {
    instance = chat;
  });
  const onError = jest.fn();
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
  jest.spyOn(view as any, 'renderView').mockImplementationOnce(() => {
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
  const inject = jest.spyOn(styleInjection, 'injectStyles');
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

it('updates message content without updating the shell for unrelated typing and transcript changes', async () => {
  const f = await boot();
  await act(async () => {
    await f.instance.messaging.addMessage({
      id: 'shell-isolated-body',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Before' }],
      },
    });
  });
  await f.view.whenReady();
  const messageText = () =>
    deepQuerySelector(
      f.view.querySelector('.cds-aichat--messages'),
      'cds-aichat-markdown'
    )?.shadowRoot?.textContent;
  await waitFor(() => expect(messageText()).toContain('Before'));
  const update = jest.spyOn(f.view as any, 'performUpdate');
  const store = f.manager.store;
  act(() => {
    store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 1));
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isHumanAgentTyping: true,
      })
    );
    store.dispatch(
      actions.updateInputState(
        { rawValue: 'Draft', content: { type: 'doc', content: [] } },
        false
      )
    );
    const local = Object.values(store.getState().allMessageItemsByID).find(
      (item) => item.fullMessageID === 'shell-isolated-body'
    );
    store.dispatch(
      actions.updateLocalMessageItem({
        ...local,
        item: { response_type: MessageResponseTypes.TEXT, text: 'After' },
      })
    );
  });
  await waitFor(() => expect(messageText()).toContain('After'));
  await f.view.updateComplete;
  expect(update).not.toHaveBeenCalled();
});

it('waits for native readiness before automatic composer focus on reopen', async () => {
  const f = await boot(ChatContainer, {
    shouldTakeFocusIfOpensAutomatically: true,
  });
  await waitFor(() => expect(f.viewState.inputComponent.hasFocus()).toBe(true));
  const widget = f.view.querySelector('cds-aichat-shell');
  await act(async () => {
    await f.instance.changeView({ mainWindow: false, launcher: true });
  });
  await waitFor(() =>
    expect(widget.classList.contains('cds-aichat-float--close')).toBe(true)
  );
  const focus = jest.spyOn(f.viewState.inputComponent, 'requestFocus');
  let release: (ready: boolean) => void;
  const blocked = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  const readiness = jest.spyOn(f.view, 'whenReady').mockReturnValue(blocked);
  await act(async () => {
    await f.instance.changeView({ mainWindow: true, launcher: false });
  });
  expect(focus).not.toHaveBeenCalled();
  expect(readiness).toHaveBeenCalled();
  await act(async () => {
    release(true);
    await blocked;
  });
  await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
});

describe('Return to conversation focus', () => {
  const flushPromises = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

  async function bootHome(shouldTakeFocusIfOpensAutomatically: boolean) {
    const f = await boot(ChatContainer, {
      shouldTakeFocusIfOpensAutomatically,
      homescreen: { isOn: true, greeting: 'Welcome' },
    });
    const home = await waitFor(() => {
      const found = f.view.querySelector('cds-aichat-home-screen');
      expect(found).not.toBeNull();
      return found as unknown as { onToggleHomeScreen: () => void };
    });
    const focus = jest.spyOn(f.viewState.inputComponent, 'requestFocus');
    let release: (ready: boolean) => void;
    const blocked = new Promise<boolean>((resolve) => {
      release = resolve;
    });
    return {
      f,
      home,
      focus,
      blocked,
      release: (ready = true) => release(ready),
    };
  }

  it('waits for native readiness, then focuses the composer once', async () => {
    const { f, home, focus, blocked, release } = await bootHome(true);
    const readiness = jest.spyOn(f.view, 'whenReady').mockReturnValue(blocked);
    act(() => home.onToggleHomeScreen());
    expect(
      chatStore(f.manager).getState().view.persistedToBrowserStorage
        .homeScreenState.isHomeScreenOpen
    ).toBe(false);
    expect(readiness).toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await blocked;
    });
    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
  });

  it('skips the focus when the shell detaches before it is ready', async () => {
    const { f, home, focus, blocked, release } = await bootHome(true);
    jest.spyOn(f.view, 'whenReady').mockReturnValue(blocked);
    act(() => home.onToggleHomeScreen());
    f.mounted.unmount();
    await act(async () => {
      release();
      await blocked;
    });
    await flushPromises();
    expect(focus).not.toHaveBeenCalled();
  });

  it('honors shouldTakeFocusIfOpensAutomatically', async () => {
    const { f, home, focus } = await bootHome(false);
    act(() => home.onToggleHomeScreen());
    await f.view.whenReady();
    await flushPromises();
    expect(
      chatStore(f.manager).getState().view.persistedToBrowserStorage
        .homeScreenState.isHomeScreenOpen
    ).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });
});

it('finishes receive callbacks while native input readiness is still pending', async () => {
  const f = await boot();
  const input = f.view.querySelector<ChatInput>('cds-aichat-chat-input');
  let release: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  jest.spyOn(input, 'ready', 'get').mockReturnValue(blocked);
  const ready = jest.fn();
  const pending = f.view.whenReady().then(ready);
  const order: string[] = [];
  f.instance.on([
    {
      type: BusEventType.PRE_RECEIVE,
      handler: () => {
        order.push('pre:receive');
      },
    },
    {
      type: BusEventType.RECEIVE,
      handler: () => {
        order.push('receive');
      },
    },
  ]);
  await act(async () => {
    await f.instance.messaging.addMessage({
      id: 'received-before-shell-ready',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Received' },
        ],
      },
    });
    order.push('complete');
  });
  expect(order).toEqual(['pre:receive', 'receive', 'complete']);
  expect(
    f.instance.state
      .get()
      .messages.some((message) => message.id === 'received-before-shell-ready')
  ).toBe(true);
  expect(ready).not.toHaveBeenCalled();
  release();
  await pending;
  expect(ready).toHaveBeenCalledWith(true);
});

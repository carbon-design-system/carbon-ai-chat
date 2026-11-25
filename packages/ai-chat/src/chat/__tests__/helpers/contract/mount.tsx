/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mounts for contract tests. Each returns only public objects: the
 * `ChatInstance` a host hands over, and the host element itself. Nothing here
 * reads the store or the service manager, so a contract test can't either.
 */

import React from 'react';
import { act, cleanup, getConfig, render } from '@testing-library/react';

import {
  ChatContainer,
  ChatContainerProps,
  ChatCustomElement,
  ChatCustomElementProps,
  ChatInstance,
  PublicConfig,
} from '../../../../aiChatEntry';
import { loadAllLazyDeps } from '../../../../serverEntry';
import { settleOpenRequests } from './backend';
// The two element entries in package.json's `exports`. Importing them defines
// `cds-aichat-container` and `cds-aichat-custom-element`.
import '../../../../web-components/cds-aichat-container/index';
import '../../../../web-components/cds-aichat-custom-element/index';

/** What a contract mount gives a test. */
export interface ContractMount {
  /** The instance the host handed to `onBeforeRender`. */
  instance: ChatInstance;
  /** The `cds-aichat-container` element the React host rendered. */
  host: HTMLElement;
  /** Renders the same host again with new props. */
  rerender: (props: Partial<ChatContainerProps>) => Promise<void>;
  /** Unmounts the host. */
  unmount: () => void;
}

/**
 * Each test's timeout in a file that calls `contractSetup`. The mount wait
 * has no deadline of its own, so this bounds a mount that never renders.
 */
const TEST_TIMEOUT = 20_000;

/** How long a describe block's warm-up may take, under a loaded machine. */
const WARM_UP_TIMEOUT = 120_000;

let lazyDepsLoaded: Promise<void> | null = null;

/**
 * Loads the chat's lazy chunks once per test file, so a cold Jest transform
 * doesn't count against a test's mount wait.
 */
export function warmUp(): Promise<void> {
  lazyDepsLoaded ??= loadAllLazyDeps();
  return lazyDepsLoaded;
}

/**
 * The chat's own signal that a mount finished its first render: the host's
 * `onAfterRender` call. `onBeforeRender` has handed over the instance by then.
 */
interface MountSignal {
  /** Resolves on the first `onAfterRender` call. */
  rendered: Promise<void>;
  /** Whether `onAfterRender` has run. */
  done: boolean;
  /** Called from the wrapped `onAfterRender`. */
  markRendered: () => void;
}

function mountSignal(): MountSignal {
  let resolve: () => void;
  const signal: MountSignal = {
    rendered: new Promise<void>((done) => {
      resolve = done;
    }),
    done: false,
    markRendered: () => {
      signal.done = true;
      resolve();
    },
  };
  return signal;
}

/** The fake-time step Testing Library's `waitFor` takes while it polls. */
const FAKE_TIME_STEP = 50;

/** How many steps a mount under fake timers gets: 10 s of fake time. */
const FAKE_TIME_STEPS = 200;

/**
 * Waits for the mount's `onAfterRender`, then checks it has handed over its
 * instance. It runs inside Testing Library's async wrapper, as `waitFor`
 * does, so React updates that land while it waits need no `act`. With real
 * timers it has no deadline: a mount that never renders fails as the test's
 * timeout.
 *
 * A test that fakes timers before it mounts owns the clock the mount's own
 * timeouts run on. Step that clock as `waitFor` did until the chat signals.
 * Its cap counts fake time, not wall time, so a loaded machine can't trip it.
 */
async function waitForMount(
  signal: MountSignal,
  handed: () => ChatInstance | null
): Promise<void> {
  await getConfig().asyncWrapper(async () => {
    if (vi.isFakeTimers()) {
      const advance = getConfig().unstable_advanceTimersWrapper;
      for (let step = 0; !signal.done && step < FAKE_TIME_STEPS; step += 1) {
        await advance(async () => {
          vi.advanceTimersByTime(FAKE_TIME_STEP);
        });
      }
      if (!signal.done) {
        throw new Error('the chat has not rendered after 10 s of fake time');
      }
    }
    await signal.rendered;
  });
  if (!handed()) {
    throw new Error('the chat rendered without handing over its instance');
  }
}

/**
 * Renders `ChatContainer` with the given props and waits for its first
 * render. `onBeforeRender` and `onAfterRender` in `props` still run.
 */
export async function contractChat(
  props: Partial<ChatContainerProps> = {}
): Promise<ContractMount> {
  await warmUp();
  let instance: ChatInstance | null = null;
  const signal = mountSignal();
  const wrap = (next: Partial<ChatContainerProps>): ChatContainerProps =>
    ({
      ...next,
      onBeforeRender: (handed: ChatInstance) => {
        instance = handed;
        return next.onBeforeRender?.(handed);
      },
      onAfterRender: (handed: ChatInstance) => {
        signal.markRendered();
        return next.onAfterRender?.(handed);
      },
    }) as ChatContainerProps;

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ChatContainer {...wrap(props)} />);
  });
  await waitForMount(signal, () => instance);

  return {
    instance,
    host: result.container.querySelector('cds-aichat-container'),
    rerender: async (next) => {
      await act(async () => {
        result.rerender(<ChatContainer {...wrap(next)} />);
      });
    },
    unmount: () => result.unmount(),
  };
}

/** What `contractCustomElementChat` gives a test. */
export interface ContractCustomElementMount extends Omit<
  ContractMount,
  'rerender'
> {
  /** The element `ChatCustomElement` renders the chat into. */
  wrapper: HTMLElement;
  /** Renders the same host again with new props. */
  rerender: (props: Partial<ChatCustomElementProps>) => Promise<void>;
}

/**
 * Renders `ChatCustomElement` (the React wrapper for a host-owned element)
 * and waits for its first render. Throws when the wrapper or the
 * `cds-aichat-container` inside it is missing.
 */
export async function contractCustomElementChat(
  props: Partial<ChatCustomElementProps> = {}
): Promise<ContractCustomElementMount> {
  await warmUp();
  let instance: ChatInstance | null = null;
  const signal = mountSignal();
  const wrap = (
    next: Partial<ChatCustomElementProps>
  ): ChatCustomElementProps =>
    ({
      className: 'contract-custom-element',
      ...next,
      onBeforeRender: (handed: ChatInstance) => {
        instance = handed;
        return next.onBeforeRender?.(handed);
      },
      onAfterRender: (handed: ChatInstance) => {
        signal.markRendered();
        return next.onAfterRender?.(handed);
      },
    }) as ChatCustomElementProps;

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ChatCustomElement {...wrap(props)} />);
  });
  await waitForMount(signal, () => instance);

  const wrapper = result.container.firstElementChild as HTMLElement | null;
  const host = wrapper?.querySelector<HTMLElement>('cds-aichat-container');
  if (!wrapper || !host) {
    throw new Error('ChatCustomElement rendered no wrapper or no container');
  }
  return {
    instance,
    host,
    wrapper,
    rerender: async (next) => {
      await act(async () => {
        result.rerender(<ChatCustomElement {...wrap(next)} />);
      });
    },
    unmount: () => result.unmount(),
  };
}

/** The two custom-element hosts. */
export type ContractElementTag =
  'cds-aichat-container' | 'cds-aichat-custom-element';

/** Both custom-element hosts, for `describe.each`. */
export const ELEMENT_TAGS: ContractElementTag[] = [
  'cds-aichat-container',
  'cds-aichat-custom-element',
];

/** What `contractElement` gives a test. */
export interface ContractElementMount {
  instance: ChatInstance;
  element: HTMLElement & Record<string, unknown>;
  /** Removes the element from the document. */
  remove: () => void;
}

/**
 * Creates a `cds-aichat-*` element, sets its properties and attributes,
 * connects it, and waits for its first render.
 */
export async function contractElement(
  tag: ContractElementTag,
  {
    properties = {},
    attributes = {},
  }: {
    properties?: Record<string, unknown> & Partial<PublicConfig>;
    attributes?: Record<string, string>;
  } = {}
): Promise<ContractElementMount> {
  await warmUp();
  const element = document.createElement(tag) as HTMLElement &
    Record<string, unknown>;
  let instance: ChatInstance | null = null;
  const signal = mountSignal();
  const { onBeforeRender, onAfterRender, ...rest } = properties as Record<
    string,
    unknown
  > & {
    onBeforeRender?: (instance: ChatInstance) => unknown;
    onAfterRender?: (instance: ChatInstance) => unknown;
  };
  Object.assign(element, rest);
  element.onBeforeRender = (handed: ChatInstance) => {
    instance = handed;
    return onBeforeRender?.(handed);
  };
  element.onAfterRender = (handed: ChatInstance) => {
    signal.markRendered();
    return onAfterRender?.(handed);
  };
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  await act(async () => {
    document.body.appendChild(element);
  });
  await waitForMount(signal, () => instance);
  return {
    instance,
    element,
    remove: () => element.remove(),
  };
}

/** The real `setTimeout`, kept from before any test installs fake timers. */
const realSetTimeout = globalThis.setTimeout;

/**
 * Connects an element that opens its main window at mount
 * (`openChatByDefault`) with no welcome request. A `messaging` in
 * `properties` is merged over `skipWelcome`.
 */
export function openElement(
  tag: ContractElementTag,
  properties: Record<string, unknown> = {}
): Promise<ContractElementMount> {
  return contractElement(tag, {
    properties: {
      ...properties,
      openChatByDefault: true,
      messaging: { skipWelcome: true, ...(properties.messaging as object) },
    },
  });
}

/**
 * Settles every fake-backend call the last test left open, and gives the chat
 * a turn to finish what each one releases. A test that ends (or times out)
 * with a call open, such as a welcome request no one answered, can leave the
 * chat waiting inside a pending `act`, which holds back every later render in
 * the file: the next mount never renders, and tests that pass alone fail.
 */
async function settleLeftoverWork(): Promise<void> {
  // This runs outside `act`: wrapped in one, the pending `act` stays stuck.
  for (let round = 0; round < 10 && settleOpenRequests() > 0; round += 1) {
    await new Promise((resolve) => realSetTimeout(resolve, 0));
  }
}

/**
 * Standard cleanup: settle backend calls the test left open, unmount React
 * trees, empty the document, clear browser storage, and restore real timers.
 * The chat saves its open view in session storage, so without the clear the next mount in a file
 * would start open and send a welcome request.
 */
export async function contractCleanup(): Promise<void> {
  await settleLeftoverWork();
  cleanup();
  document.body.innerHTML = '';
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.useRealTimers();
}

/**
 * Registers a describe block's setup. Before its first test it loads the lazy
 * chunks and mounts one throwaway chat, under a long timeout, so a cold start
 * doesn't count against the first test's own timeout. It sets the file's
 * test timeout, which bounds each mount. After each test it runs
 * `contractCleanup`. `describeShared` calls it; call it first in every other
 * describe block that mounts a chat.
 */
export function contractSetup(): void {
  vi.setConfig({ testTimeout: TEST_TIMEOUT });
  beforeAll(async () => {
    await contractChat();
    await contractCleanup();
  }, WARM_UP_TIMEOUT);
  afterEach(contractCleanup);
}

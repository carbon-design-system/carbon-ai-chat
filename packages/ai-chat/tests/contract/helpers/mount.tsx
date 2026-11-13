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
import { act, cleanup, render, waitFor } from '@testing-library/react';

import {
  ChatContainer,
  ChatContainerProps,
  ChatCustomElement,
  ChatCustomElementProps,
  ChatInstance,
  PublicConfig,
} from '../../../src/aiChatEntry';
import { loadAllLazyDeps } from '../../../src/serverEntry';
import { settleOpenRequests } from './backend';
// The two element entries in package.json's `exports`. Importing them defines
// `cds-aichat-container` and `cds-aichat-custom-element`.
import '../../../src/web-components/cds-aichat-container/index';
import '../../../src/web-components/cds-aichat-custom-element/index';

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

const MOUNT_TIMEOUT = 10000;

/**
 * Each test's timeout in a file that calls `contractSetup`. It sits above the
 * mount wait, so a slow mount on a loaded machine fails as the mount's own
 * error, or passes, rather than timing out the test around it.
 */
const TEST_TIMEOUT = 2 * MOUNT_TIMEOUT;

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

/** Waits until a mount has handed over its instance and rendered. */
async function waitForMount(
  isReady: () => boolean,
  timeout = MOUNT_TIMEOUT
): Promise<void> {
  await waitFor(
    () => {
      if (!isReady()) {
        throw new Error('the chat has not rendered yet');
      }
    },
    { timeout }
  );
}

/**
 * Renders `ChatContainer` with the given props and waits for its first
 * render. `onBeforeRender` and `onAfterRender` in `props` still run.
 */
export function contractChat(
  props: Partial<ChatContainerProps> = {}
): Promise<ContractMount> {
  return mountChatContainer(props, MOUNT_TIMEOUT);
}

async function mountChatContainer(
  props: Partial<ChatContainerProps>,
  timeout: number
): Promise<ContractMount> {
  await warmUp();
  let instance: ChatInstance | null = null;
  let rendered = false;
  const wrap = (next: Partial<ChatContainerProps>): ChatContainerProps =>
    ({
      ...next,
      onBeforeRender: (handed: ChatInstance) => {
        instance = handed;
        return next.onBeforeRender?.(handed);
      },
      onAfterRender: (handed: ChatInstance) => {
        rendered = true;
        return next.onAfterRender?.(handed);
      },
    }) as ChatContainerProps;

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ChatContainer {...wrap(props)} />);
  });
  await waitForMount(() => instance !== null && rendered, timeout);

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
  let rendered = false;
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
        rendered = true;
        return next.onAfterRender?.(handed);
      },
    }) as ChatCustomElementProps;

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ChatCustomElement {...wrap(props)} />);
  });
  await waitForMount(() => instance !== null && rendered);

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
  let rendered = false;
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
    rendered = true;
    return onAfterRender?.(handed);
  };
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  await act(async () => {
    document.body.appendChild(element);
  });
  await waitForMount(() => instance !== null && rendered);
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
  jest.useRealTimers();
}

/**
 * Registers a describe block's setup. Before its first test it loads the lazy
 * chunks and mounts one throwaway chat, under a long timeout, so a cold start
 * doesn't count against the first test's own timeout. It raises the file's
 * test timeout above the mount wait. After each test it runs
 * `contractCleanup`. `describeShared` calls it; call it first in every other
 * describe block that mounts a chat.
 */
export function contractSetup(): void {
  jest.setTimeout(TEST_TIMEOUT);
  beforeAll(async () => {
    await mountChatContainer({}, WARM_UP_TIMEOUT);
    await contractCleanup();
  }, WARM_UP_TIMEOUT);
  afterEach(contractCleanup);
}

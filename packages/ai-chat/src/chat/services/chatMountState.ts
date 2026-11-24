/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AriaAnnouncer } from './ariaAnnouncer';
import { subscribeToIntl } from '../../sdk/utils/intlUtils';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import type { IntlShape } from '../../sdk/utils/i18n';
import type { Dimension } from '../../types/utilities/Dimension';
import type { HasRequestFocus } from '../../types/utilities/HasRequestFocus';
import type { MainWindowFunctions } from '../../types/utilities/MainWindowFunctions';
import type { AriaAnnouncerFunctionType } from './ariaAnnouncer';
import type { InputFunctions } from '../utils/inputTypes';
import { chatStore } from './attachChatView';

/** What a connected shell publishes for the view ports. */
interface ShellHandles {
  mainWindow?: MainWindowFunctions;
  appWindow?: HasRequestFocus;
  ariaAnnouncer?: AriaAnnouncerFunctionType;
  inputComponent?: InputFunctions | null;
}

interface ChatMountStateSnapshot {
  readonly serviceManager: ServiceManager;
  readonly intl: IntlShape;
  readonly windowSize: Dimension;
}

/**
 * What belongs to one mount, which views read outside the store: the chat's
 * services, the formatter, window size, the announcer, and the initial-render
 * holds. `cds-aichat-container` creates one per mount; React reads it through
 * `ChatContext`, and Lit through the mount-state Lit context. State that
 * outlives a mount, such as an open confirmation, is in the store's view
 * partition (`chat/state/`).
 */
class ChatMountState {
  readonly announcer: AriaAnnouncer;

  // Handles the connected shell publishes, read by the view ports. They're
  // read-only here; `ShellLifecycle` writes them through `setShellHandle`.
  private shellHandles: ShellHandles = {};

  get mainWindow() {
    return this.shellHandles.mainWindow;
  }

  get appWindow() {
    return this.shellHandles.appWindow;
  }

  get ariaAnnouncer() {
    return this.shellHandles.ariaAnnouncer;
  }

  /** The input's one handle, while it's rendered. */
  get inputComponent() {
    return this.shellHandles.inputComponent;
  }

  /** Publishes or clears one shell handle. Only `ShellLifecycle` calls this. */
  setShellHandle<K extends keyof ShellHandles>(
    name: K,
    value: ShellHandles[K]
  ): void {
    this.shellHandles[name] = value;
  }

  private snapshot: ChatMountStateSnapshot;
  private listeners = new Set<() => void>();
  private unsubscribeIntl: (() => void) | null = null;
  private isDetached = false;
  private initialReactHolds = new Set<object>();
  private initialReactWaiters = new Set<() => void>();
  private initialReactCheckQueued = false;
  private initialReactGeneration = 0;

  /**
   * @param serviceManager - The chat this view shows.
   * @param windowSize - The window's size at mount.
   * @param customHostElement - The host's element the chat renders into, if
   *   it doesn't float. The view owns it; the chat's services never see it.
   */
  constructor(
    readonly serviceManager: ServiceManager,
    windowSize: Dimension,
    readonly customHostElement?: HTMLElement
  ) {
    const { intl } = serviceManager;
    this.snapshot = Object.freeze({
      serviceManager,
      intl,
      windowSize,
    });
    this.announcer = new AriaAnnouncer(
      chatStore(serviceManager),
      intl?.formatMessage
    );
  }

  getSnapshot = (): ChatMountStateSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Calls `listener` only when the selected value changes. */
  select<T>(
    selector: (snapshot: ChatMountStateSnapshot) => T,
    listener: (value: T) => void,
    isEqual: (left: T, right: T) => boolean = Object.is
  ): () => void {
    let selected = selector(this.snapshot);
    return this.subscribe(() => {
      const next = selector(this.snapshot);
      if (!isEqual(selected, next)) {
        selected = next;
        listener(next);
      }
    });
  }

  /**
   * True once the mount detaches, before its views unmount. A view's cleanup
   * reads it to tell the mount ending from the view alone going away.
   */
  get detached(): boolean {
    return this.isDetached;
  }

  connect(): void {
    if (this.unsubscribeIntl) {
      return;
    }
    this.isDetached = false;
    this.unsubscribeIntl = subscribeToIntl(this.serviceManager, this.syncIntl);
    this.syncIntl();
  }

  disconnect(): void {
    this.isDetached = true;
    this.unsubscribeIntl?.();
    this.unsubscribeIntl = null;
    this.initialReactGeneration += 1;
    this.initialReactHolds.clear();
    this.initialReactWaiters.clear();
    this.initialReactCheckQueued = false;
  }

  holdInitialReactCommit(): () => void {
    const token = {};
    this.initialReactHolds.add(token);
    return () => {
      if (this.initialReactHolds.delete(token)) {
        this.checkInitialReactCommit();
      }
    };
  }

  whenInitialReactCommitReady(callback: () => void): () => void {
    this.initialReactWaiters.add(callback);
    this.checkInitialReactCommit();
    return () => {
      this.initialReactWaiters.delete(callback);
    };
  }

  private checkInitialReactCommit(): void {
    if (this.initialReactCheckQueued) {
      return;
    }
    this.initialReactCheckQueued = true;
    const generation = this.initialReactGeneration;
    // StrictMode can release and reacquire holds in the same effect replay.
    queueMicrotask(() => {
      if (generation !== this.initialReactGeneration) {
        return;
      }
      this.initialReactCheckQueued = false;
      if (this.initialReactHolds.size) {
        return;
      }
      const waiters = Array.from(this.initialReactWaiters);
      this.initialReactWaiters.clear();
      waiters.forEach((callback) => callback());
    });
  }

  setWindowSize(windowSize: Dimension): void {
    const current = this.snapshot.windowSize;
    if (
      current.width !== windowSize.width ||
      current.height !== windowSize.height
    ) {
      this.update({ windowSize });
    }
  }

  private syncIntl = (): void => {
    const { intl } = this.serviceManager;
    if (intl !== this.snapshot.intl) {
      this.announcer.setFormatter(intl.formatMessage);
      this.update({ intl });
    }
  };

  private update(change: Partial<ChatMountStateSnapshot>): void {
    if (
      (Object.keys(change) as (keyof ChatMountStateSnapshot)[]).every(
        (key) => this.snapshot[key] === change[key]
      )
    ) {
      return;
    }
    this.snapshot = Object.freeze({ ...this.snapshot, ...change });
    this.listeners.forEach((listener) => listener());
  }
}

export { ChatMountState };
export type { ChatMountStateSnapshot };

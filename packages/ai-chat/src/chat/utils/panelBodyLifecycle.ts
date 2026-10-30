/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { RESPONSE_TYPE_TIMEOUT_MS } from './constants';

interface HydrationBodyOptions {
  isHydrated: boolean;
  announcement: string;
}

class HydrationBodyLifecycle {
  private ready = false;
  private connected = false;
  private generation = 0;
  private announced = false;
  private delay?: ReturnType<typeof setTimeout>;
  private announcements = new Set<ReturnType<typeof setTimeout>>();
  private listeners = new Set<() => void>();

  constructor(
    private options: HydrationBodyOptions,
    private announce: (text: string) => void
  ) {}

  getSnapshot = (): boolean => this.ready;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.generation += 1;
    this.announced = false;
    if (this.ready) {
      this.ready = false;
      this.listeners.forEach((listener) => listener());
    }
    if (!this.connected) {
      return;
    }
    const generation = this.generation;
    this.delay = setTimeout(() => {
      if (!this.connected || generation !== this.generation) {
        return;
      }
      this.delay = undefined;
      this.ready = true;
      this.listeners.forEach((listener) => listener());
      this.maybeAnnounce();
    }, 400);
  }

  update(options: HydrationBodyOptions): void {
    this.options = options;
    if (options.isHydrated) {
      this.announced = false;
    }
    this.maybeAnnounce();
  }

  disconnect(): void {
    this.connected = false;
    this.generation += 1;
    clearTimeout(this.delay);
    this.delay = undefined;
    this.announcements.forEach(clearTimeout);
    this.announcements.clear();
  }

  private maybeAnnounce(): void {
    const { isHydrated, announcement } = this.options;
    if (
      !this.connected ||
      !this.ready ||
      isHydrated ||
      this.announced ||
      !announcement
    ) {
      return;
    }
    this.announced = true;
    const generation = this.generation;
    const timer = setTimeout(() => {
      this.announcements.delete(timer);
      if (this.connected && generation === this.generation) {
        this.announce(announcement);
      }
    }, 0);
    this.announcements.add(timer);
  }
}

interface IFrameBodySnapshot {
  readonly loading: boolean;
  readonly showSpinner: boolean;
  readonly error: boolean;
}

class IFrameBodyLifecycle {
  private snapshot: IFrameBodySnapshot = {
    loading: true,
    showSpinner: false,
    error: false,
  };
  private connected = false;
  private generation = 0;
  private timeoutGeneration = 0;
  private spinnerDelay?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();

  constructor(
    private errorText: string,
    private callbacks: { loaded(): void; timedOut(): void }
  ) {}

  getSnapshot = (): IFrameBodySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.generation += 1;
    const generation = this.generation;
    this.setSnapshot({ loading: true, showSpinner: false, error: false });
    if (!this.connected || generation !== this.generation) {
      return;
    }
    this.spinnerDelay = setTimeout(() => {
      if (
        this.connected &&
        generation === this.generation &&
        this.snapshot.loading
      ) {
        this.spinnerDelay = undefined;
        this.setSnapshot({ ...this.snapshot, showSpinner: true });
      }
    }, 1500);
    this.scheduleTimeout();
  }

  update(errorText: string): void {
    const changed = errorText !== this.errorText;
    this.errorText = errorText;
    if (changed && this.connected && this.snapshot.loading) {
      this.scheduleTimeout();
    }
  }

  loaded(): void {
    if (!this.connected) {
      return;
    }
    const generation = this.generation;
    this.clearTimers();
    this.setSnapshot({ ...this.snapshot, loading: false, showSpinner: false });
    if (this.connected && generation === this.generation) {
      this.callbacks.loaded();
    }
  }

  disconnect(): void {
    this.connected = false;
    this.generation += 1;
    this.clearTimers();
  }

  private scheduleTimeout(): void {
    clearTimeout(this.timeout);
    this.timeoutGeneration += 1;
    const generation = this.generation;
    const timeoutGeneration = this.timeoutGeneration;
    this.timeout = setTimeout(() => {
      if (
        !this.connected ||
        generation !== this.generation ||
        timeoutGeneration !== this.timeoutGeneration
      ) {
        return;
      }
      this.clearTimers();
      this.setSnapshot({ loading: false, showSpinner: false, error: true });
      if (this.connected && generation === this.generation) {
        this.callbacks.timedOut();
      }
    }, RESPONSE_TYPE_TIMEOUT_MS);
  }

  private clearTimers(): void {
    this.timeoutGeneration += 1;
    clearTimeout(this.spinnerDelay);
    clearTimeout(this.timeout);
    this.spinnerDelay = undefined;
    this.timeout = undefined;
  }

  private setSnapshot(snapshot: IFrameBodySnapshot): void {
    if (
      snapshot.loading !== this.snapshot.loading ||
      snapshot.showSpinner !== this.snapshot.showSpinner ||
      snapshot.error !== this.snapshot.error
    ) {
      this.snapshot = snapshot;
      this.listeners.forEach((listener) => listener());
    }
  }
}

class DisclaimerReadState {
  private hasRead = false;
  private listeners = new Set<() => void>();
  private panel?: HTMLElement;
  private generation = 0;
  private probes: ReturnType<typeof setTimeout>[] = [];

  getSnapshot = (): boolean => this.hasRead;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  observeScroll({
    isScrollable,
    isAtBottom,
  }: {
    isScrollable: boolean;
    isAtBottom: boolean;
  }): void {
    if (!this.hasRead && (!isScrollable || isAtBottom)) {
      this.hasRead = true;
      this.listeners.forEach((listener) => listener());
    }
  }

  connect(panel: HTMLElement): void {
    if (this.panel === panel) {
      return;
    }
    this.disconnect();
    this.panel = panel;
    const generation = this.generation;
    this.probes = [100, 300, 500].map((delay) =>
      setTimeout(() => {
        if (this.panel === panel && generation === this.generation) {
          panel.shadowRoot
            ?.querySelector('.panel-body')
            ?.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
      }, delay)
    );
  }

  disconnect(): void {
    this.generation += 1;
    this.panel = undefined;
    this.probes.forEach(clearTimeout);
    this.probes = [];
  }
}

export { HydrationBodyLifecycle, IFrameBodyLifecycle, DisclaimerReadState };

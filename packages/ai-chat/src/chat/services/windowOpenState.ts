/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { prefersReducedMotion } from '../utils/prefersReducedMotion';

export interface WindowOpenStateOptions {
  viewStateMainWindow: boolean;
  isHydrated: boolean;
  useCustomHostElement: boolean;
  requestFocus: () => void;
}

interface WindowOpenStateSnapshot {
  open: boolean;
  closing: boolean;
  isHydrationAnimationComplete: boolean;
}

// The close animation is 110ms; allow a buffer when animationend never arrives.
const CLOSE_ANIMATION_TIMEOUT_MS = 500;

export class WindowOpenState {
  private snapshot: WindowOpenStateSnapshot;
  private listeners = new Set<() => void>();
  private connected = false;
  private wasHydrated = false;
  private closeElement: HTMLElement | null = null;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private focusFrame: number | null = null;

  constructor(
    private options: WindowOpenStateOptions,
    private getContainer: () => HTMLElement | null
  ) {
    this.snapshot = {
      open: options.viewStateMainWindow,
      closing: false,
      isHydrationAnimationComplete: options.isHydrated,
    };
  }

  getSnapshot = (): WindowOpenStateSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.update(this.options);
  }

  update(options: WindowOpenStateOptions): void {
    this.options = options;
    if (!this.connected) {
      return;
    }
    if (!this.wasHydrated && options.isHydrated) {
      this.setIsHydrationAnimationComplete(true);
      if (this.focusFrame !== null) {
        cancelAnimationFrame(this.focusFrame);
      }
      const frame = requestAnimationFrame(() => {
        if (this.focusFrame === frame && this.connected) {
          this.focusFrame = null;
          this.options.requestFocus();
        }
      });
      this.focusFrame = frame;
    }
    this.wasHydrated = options.isHydrated;
    if (options.viewStateMainWindow) {
      const shouldFocus = !this.snapshot.open || this.snapshot.closing;
      this.cancelClose();
      this.setSnapshot({ open: true, closing: false });
      if (shouldFocus) {
        options.requestFocus();
      }
    } else if (this.snapshot.open && this.closeTimeout === null) {
      this.close();
    }
  }

  setIsHydrationAnimationComplete = (value: boolean): void => {
    this.setSnapshot({ isHydrationAnimationComplete: value });
  };

  disconnect(): void {
    this.connected = false;
    this.cancelClose();
    if (this.focusFrame !== null) {
      cancelAnimationFrame(this.focusFrame);
      this.focusFrame = null;
      this.wasHydrated = false;
    }
  }

  private setSnapshot(change: Partial<WindowOpenStateSnapshot>): void {
    if (
      (Object.keys(change) as (keyof WindowOpenStateSnapshot)[]).every(
        (key) => this.snapshot[key] === change[key]
      )
    ) {
      return;
    }
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }

  private close(): void {
    this.setSnapshot({ closing: true });
    this.closeElement = this.getContainer();
    if (
      this.options.useCustomHostElement ||
      prefersReducedMotion() ||
      !this.closeElement
    ) {
      this.finishClose();
      return;
    }
    this.closeElement.addEventListener('animationend', this.finishClose);
    this.closeTimeout = setTimeout(
      this.finishClose,
      CLOSE_ANIMATION_TIMEOUT_MS
    );
    this.options.requestFocus();
  }

  private finishClose = (): void => {
    this.cancelClose();
    this.setSnapshot({ open: false, closing: false });
  };

  private cancelClose(): void {
    this.closeElement?.removeEventListener('animationend', this.finishClose);
    this.closeElement = null;
    if (this.closeTimeout !== null) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }
}

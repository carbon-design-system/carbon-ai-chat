/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { prefersReducedMotion } from '../utils/prefersReducedMotion';

enum LauncherOpenState {
  Opening = 'opening',
  Open = 'open',
  Closing = 'closing',
  Closed = 'closed',
}

interface LauncherStateOptions {
  extended: boolean;
  autoExtendEnabled: boolean;
  timeToExpand: number;
}

interface LauncherTransitionTargets {
  greeting: HTMLElement | null;
  textHolder: HTMLElement | null;
}

const LAUNCHER_ANIMATION_TIMEOUT_MS = 600;

class LauncherState {
  private snapshot: LauncherOpenState;
  private listeners = new Set<() => void>();
  private connected = false;
  private generation = 0;
  private hasScheduledAutoExtend = false;
  private autoExtendTimeout: ReturnType<typeof setTimeout> | undefined;
  private autoExtendGeneration = 0;
  private transitionGeneration = 0;
  private transitionTarget: HTMLElement | null = null;
  private releaseTransition?: () => void;

  constructor(
    private options: LauncherStateOptions,
    private callbacks: {
      setExpanded(value: boolean): void;
      setShouldStartCounter(value: boolean): void;
    }
  ) {
    this.snapshot = options.extended
      ? LauncherOpenState.Open
      : LauncherOpenState.Closed;
  }

  getSnapshot = (): LauncherOpenState => this.snapshot;

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
    this.setSnapshot(
      this.options.extended ? LauncherOpenState.Open : LauncherOpenState.Closed
    );
    this.updateAutoExtend();
  }

  update(options: LauncherStateOptions): void {
    const previous = this.options;
    this.options = options;
    if (!this.connected) {
      return;
    }
    if (previous.extended !== options.extended) {
      this.cancelTransition();
      this.setSnapshot(
        options.extended ? LauncherOpenState.Opening : LauncherOpenState.Closing
      );
    }
    if (
      previous.extended !== options.extended ||
      previous.autoExtendEnabled !== options.autoExtendEnabled ||
      previous.timeToExpand !== options.timeToExpand
    ) {
      this.updateAutoExtend();
    }
  }

  bindTransitionTargets({
    greeting,
    textHolder,
  }: LauncherTransitionTargets): void {
    if (!this.connected) {
      return;
    }
    const opening = this.snapshot === LauncherOpenState.Opening;
    if (!opening && this.snapshot !== LauncherOpenState.Closing) {
      return;
    }
    const target = opening ? greeting : textHolder;
    if (this.releaseTransition && this.transitionTarget === target) {
      return;
    }
    this.cancelTransition();
    const generation = this.generation;
    const transition = this.transitionGeneration;
    const finish = () => {
      if (
        !this.connected ||
        generation !== this.generation ||
        transition !== this.transitionGeneration
      ) {
        return;
      }
      this.cancelTransition();
      this.setSnapshot(
        opening ? LauncherOpenState.Open : LauncherOpenState.Closed
      );
    };
    if (!target || prefersReducedMotion()) {
      finish();
      return;
    }
    const onAnimationEnd = (event: Event) => {
      if (event.target === target) {
        finish();
      }
    };
    target.addEventListener('animationend', onAnimationEnd);
    target.addEventListener('animationcancel', onAnimationEnd);
    const timeout = setTimeout(finish, LAUNCHER_ANIMATION_TIMEOUT_MS);
    this.transitionTarget = target;
    this.releaseTransition = () => {
      target.removeEventListener('animationend', onAnimationEnd);
      target.removeEventListener('animationcancel', onAnimationEnd);
      clearTimeout(timeout);
    };
  }

  close(): void {
    if (!this.connected) {
      return;
    }
    this.clearAutoExtend();
    const generation = this.generation;
    this.callbacks.setExpanded(false);
    if (this.connected && this.generation === generation) {
      this.callbacks.setShouldStartCounter(false);
    }
  }

  disconnect(): void {
    this.connected = false;
    this.generation += 1;
    this.clearAutoExtend();
    this.cancelTransition();
    this.hasScheduledAutoExtend = false;
  }

  private setSnapshot(snapshot: LauncherOpenState): void {
    if (this.snapshot !== snapshot) {
      this.snapshot = snapshot;
      this.listeners.forEach((listener) => listener());
    }
  }

  private updateAutoExtend(): void {
    this.clearAutoExtend();
    if (!this.connected) {
      return;
    }
    if (!this.options.autoExtendEnabled) {
      this.hasScheduledAutoExtend = false;
      return;
    }
    if (this.hasScheduledAutoExtend) {
      return;
    }
    this.hasScheduledAutoExtend = true;
    const generation = this.generation;
    const timer = this.autoExtendGeneration;
    this.autoExtendTimeout = setTimeout(() => {
      if (
        !this.connected ||
        generation !== this.generation ||
        timer !== this.autoExtendGeneration
      ) {
        return;
      }
      this.autoExtendTimeout = undefined;
      this.callbacks.setShouldStartCounter(false);
      if (this.connected && this.generation === generation) {
        this.callbacks.setExpanded(true);
      }
    }, this.options.timeToExpand);
  }

  private clearAutoExtend(): void {
    this.autoExtendGeneration += 1;
    if (this.autoExtendTimeout !== undefined) {
      clearTimeout(this.autoExtendTimeout);
      this.autoExtendTimeout = undefined;
    }
  }

  private cancelTransition(): void {
    this.transitionGeneration += 1;
    this.releaseTransition?.();
    this.releaseTransition = undefined;
    this.transitionTarget = null;
  }
}

export type { LauncherStateOptions };
export { LauncherOpenState, LauncherState };

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { InitialStateKey } from "./types.js";

/**
 * Manages component initialization state tracking.
 * Tracks when various initial state properties have been set and determines
 * when initialization is complete to prevent visible layout thrashing.
 */
export class InitializationManager {
  private initialStateSet: Record<InitialStateKey, boolean> = {
    inputAndMessagesAtMaxWidth: false,
    shouldRenderHistory: false,
    hasSlotContent: false,
  };

  private isInitializing = true;
  private onCompleteCallback?: () => void;

  /**
   * Mark a specific initial state property as set
   */
  markStateSet(key: InitialStateKey): void {
    this.initialStateSet[key] = true;
    this.checkInitializationComplete();
  }

  /**
   * Check if initialization is complete
   */
  isInitializationComplete(): boolean {
    return !this.isInitializing;
  }

  /**
   * Get the current initializing state
   */
  getInitializingState(): boolean {
    return this.isInitializing;
  }

  /**
   * Set callback to be called when initialization completes
   */
  onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  /**
   * Reset initialization state (useful for testing or re-initialization)
   */
  reset(): void {
    this.initialStateSet = {
      inputAndMessagesAtMaxWidth: false,
      shouldRenderHistory: false,
      hasSlotContent: false,
    };
    this.isInitializing = true;
  }

  /**
   * Check if all initial state properties have been set
   * and mark initialization as complete if so
   */
  private checkInitializationComplete(): void {
    const allChecksComplete = Object.values(this.initialStateSet).every(
      (check) => check === true,
    );

    if (allChecksComplete && this.isInitializing) {
      // Use double RAF to ensure all cascading updates have completed
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.isInitializing = false;
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
        });
      });
    }
  }
}

// Made with Bob

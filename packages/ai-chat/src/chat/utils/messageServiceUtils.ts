/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A class that manages if the message is taking to long to load. Allows you to identify if behaviors for if a request
 * exceeds an amount of time to timeout or exceeds an amount of time to not show a loading indicator.
 */

class MessageLoadingManager {
  /**
   * If the call has taken longer than the msMaxSilentLoading time.
   */
  private hasExceededMaxSilentLoading: boolean;

  /**
   * Callback when the request has ended.
   */
  private onEnd: (hasExceededMaxSilentLoading: boolean) => void;

  /**
   * A setTimeout to fire handling of msMaxAttempt being exceeded.
   */
  private onMaxAttempt: any;

  /**
   * A setTimeout to fire handling of msMaxSilentLoading being exceeded.
   */
  private onSilentLoading: any;

  /**
   * Start the counters.
   *
   * @param onExceededMaxSilentLoading The callback to call if the call exceeds the max loading time.
   * @param onEnd The callback when .end() is called. If .end() is called with .end(boolean), that will be passed.
   * @param onTimeout The callback if the timer times out and we should error out the message.
   * @param msMaxSilentLoading The amount of time in MS we wait before showing a progress bar.
   * @param msMaxAttempt The max amount of time that has passed before we give up.
   */
  start(
    onExceededMaxSilentLoading: () => void,
    onEnd: (hasExceededMaxSilentLoading: boolean) => void,
    onTimeout: () => void,
    msMaxSilentLoading: number,
    msMaxAttempt: number,
  ) {
    this.hasExceededMaxSilentLoading = false;
    this.onEnd = onEnd;

    if (msMaxSilentLoading) {
      this.onSilentLoading = setTimeout(() => {
        this.hasExceededMaxSilentLoading = true;
        onExceededMaxSilentLoading();
      }, msMaxSilentLoading);
    }

    if (msMaxAttempt) {
      this.onMaxAttempt = setTimeout(() => {
        onTimeout();
      }, msMaxAttempt);
    }
  }

  /**
   * Called when message succeeds/fails the loading manager is no longer needed. Calls this.end and resets the class.
   */
  end() {
    if (this.onMaxAttempt) {
      clearTimeout(this.onMaxAttempt);
    }
    if (this.onSilentLoading) {
      clearTimeout(this.onSilentLoading);
    }
    if (this.onEnd) {
      this.onEnd(this.hasExceededMaxSilentLoading);
    }
    this.hasExceededMaxSilentLoading = null;
    this.onEnd = null;
  }
}

export { MessageLoadingManager };

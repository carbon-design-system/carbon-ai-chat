/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

type RequestToken = Readonly<{ identity: symbol }>;

class RequestQueue {
  private current: RequestToken | null = null;
  private waiting: RequestToken[] = [];

  getCurrent() {
    return this.current;
  }

  getWaitingCount() {
    return this.waiting.length;
  }

  getWaitingAt(index: number) {
    return this.waiting[index];
  }

  enqueue(token: RequestToken) {
    this.waiting.push(token);
  }

  takeNext() {
    if (this.current || !this.waiting.length) {
      return null;
    }
    this.current = this.waiting.shift();
    return this.current;
  }

  clearCurrent() {
    this.current = null;
  }

  removeWaiting(token: RequestToken) {
    const index = this.waiting.indexOf(token);
    if (index !== -1) {
      this.waiting.splice(index, 1);
    }
  }
}

export { RequestQueue };
export type { RequestToken };

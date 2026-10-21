/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Window flag that the Playwright fixture sets before the page loads. It opts
 * the mock backend into the short delays below.
 */
const FAST_TIMERS_FLAG = '__DEMO_FAST_TIMERS__';

const NORMAL_TIMING = {
  wordDelay: 40,
  delayedResponseMs: 3000,
  consecutiveSecondDelayMs: 1000,
};

const FAST_TIMING = {
  wordDelay: 5,
  delayedResponseMs: 300,
  consecutiveSecondDelayMs: 100,
};

const timing =
  typeof window !== 'undefined' &&
  (window as unknown as Record<string, unknown>)[FAST_TIMERS_FLAG] === true
    ? FAST_TIMING
    : NORMAL_TIMING;

export { FAST_TIMERS_FLAG, FAST_TIMING, timing };

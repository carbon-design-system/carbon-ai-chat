/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageLoadingManager } from '../../../src/chat/utils/messageServiceUtils';

describe('MessageLoadingManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers silent loading and end callbacks', () => {
    const manager = new MessageLoadingManager();
    const onExceeded = jest.fn();
    const onEnd = jest.fn();
    const onTimeout = jest.fn();

    manager.start(onExceeded, onEnd, onTimeout, 100, 0);
    jest.advanceTimersByTime(150);

    manager.end();

    expect(onExceeded).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('triggers timeout callback', () => {
    const manager = new MessageLoadingManager();
    const onTimeout = jest.fn();

    manager.start(jest.fn(), jest.fn(), onTimeout, 0, 200);

    jest.advanceTimersByTime(250);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('ends the previous run when a new one starts', () => {
    const manager = new MessageLoadingManager();
    const onExceededFirst = jest.fn();
    const onEndFirst = jest.fn();
    const onTimeoutFirst = jest.fn();
    const onExceededSecond = jest.fn();

    manager.start(onExceededFirst, onEndFirst, onTimeoutFirst, 100, 200);
    manager.start(onExceededSecond, jest.fn(), jest.fn(), 100, 0);
    jest.advanceTimersByTime(250);

    expect(onEndFirst).toHaveBeenCalledWith(false);
    expect(onExceededFirst).not.toHaveBeenCalled();
    expect(onTimeoutFirst).not.toHaveBeenCalled();
    expect(onExceededSecond).toHaveBeenCalledTimes(1);
  });

  it('reports that the previous run exceeded silent loading when a new one starts', () => {
    const manager = new MessageLoadingManager();
    const onEndFirst = jest.fn();

    manager.start(jest.fn(), onEndFirst, jest.fn(), 100, 0);
    jest.advanceTimersByTime(150);
    manager.start(jest.fn(), jest.fn(), jest.fn(), 100, 0);

    expect(onEndFirst).toHaveBeenCalledWith(true);
  });
});

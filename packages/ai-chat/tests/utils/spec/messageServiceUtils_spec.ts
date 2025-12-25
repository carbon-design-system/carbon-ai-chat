/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageLoadingManager } from "../../../src/chat/utils/messageServiceUtils";

describe("MessageLoadingManager", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("triggers silent loading and end callbacks", () => {
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

  it("triggers timeout callback", () => {
    const manager = new MessageLoadingManager();
    const onTimeout = jest.fn();

    manager.start(jest.fn(), jest.fn(), onTimeout, 0, 200);

    jest.advanceTimersByTime(250);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

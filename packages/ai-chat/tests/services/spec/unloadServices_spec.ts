/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";

describe("ChatInstance.destroy / unloadServices", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("exposes destroy alongside destroySession", async () => {
    const instance = await renderChatAndGetInstance(createBaseConfig());

    expect(typeof instance.destroy).toBe("function");
    expect(typeof instance.destroySession).toBe("function");
  });

  it("tears down every service on destroy", async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const clearBus = jest.spyOn(serviceManager.eventBus, "clear");
    const stopWatching = jest.spyOn(
      serviceManager.themeWatcherService,
      "stopWatching",
    );
    const disposeMessages = jest.spyOn(
      serviceManager.messageService,
      "dispose",
    );
    const clearUpserts = jest.spyOn(
      serviceManager.messageUpsertCoordinator,
      "clearAll",
    );

    instance.destroy();

    expect(clearBus).toHaveBeenCalledTimes(1);
    expect(stopWatching).toHaveBeenCalledTimes(1);
    expect(disposeMessages).toHaveBeenCalledTimes(1);
    expect(clearUpserts).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — a second destroy tears nothing down again and does not throw", async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const clearBus = jest.spyOn(serviceManager.eventBus, "clear");

    instance.destroy();
    expect(clearBus).toHaveBeenCalledTimes(1);

    expect(() => instance.destroy()).not.toThrow();
    expect(clearBus).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes every captured store subscription on teardown", async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    // Boot registers four store subscriptions (copy-to-session-storage, fire-state-change,
    // refresh-localization, and the theme watcher). The exposed serviceManager shares the same
    // `storeUnsubscribers` array as the live manager, so mutate it in place to wrap each handle
    // (reassigning would only swap this copy's reference).
    const handles = serviceManager.storeUnsubscribers;
    expect(handles).toHaveLength(4);
    const wrapped = handles.map((unsubscribe) => jest.fn(unsubscribe));
    handles.length = 0;
    handles.push(...wrapped);

    instance.destroy();

    wrapped.forEach((unsubscribe) =>
      expect(unsubscribe).toHaveBeenCalledTimes(1),
    );
  });
});

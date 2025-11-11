/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AppState } from "../../../src/types/state/AppState";
import { NotificationMessage } from "../../../src/types/instance/apiTypes";
import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";
import { NOTIFICATION_KIND } from "@carbon/web-components/es/components/notification/defs";

describe("ChatInstance.notifications", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should add notification to Redux state", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const notification: NotificationMessage = {
      kind: NOTIFICATION_KIND.INFO,
      title: "Test notification",
      message: "Test notification message",
    };

    instance.notifications.addNotification(notification);

    const store = (instance as any).serviceManager.store;
    const state: AppState = store.getState();
    expect(state.notifications.length).toBeGreaterThan(0);
  });

  it("should remove notifications by group ID from Redux state", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Add notification first
    const notification: NotificationMessage = {
      kind: NOTIFICATION_KIND.INFO,
      title: "Test notification",
      message: "Test notification message",
    };
    instance.notifications.addNotification(notification);

    const store = (instance as any).serviceManager.store;
    let state: AppState = store.getState();
    const initialCount = state.notifications.length;
    expect(initialCount).toBeGreaterThan(0);

    // Remove notifications by group ID
    instance.notifications.removeNotifications("test-group");

    state = store.getState();
    // Since we're removing by a group ID that doesn't exist, the count should remain the same
    expect(state.notifications.length).toBe(initialCount);
  });

  it("should remove all notifications from Redux state", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const notification1: NotificationMessage = {
      kind: NOTIFICATION_KIND.INFO,
      title: "Test notification 1",
      message: "Test notification message 1",
    };

    const notification2: NotificationMessage = {
      kind: NOTIFICATION_KIND.WARNING,
      title: "Test notification 2",
      message: "Test notification message 2",
    };

    // Add notifications first
    instance.notifications.addNotification(notification1);
    instance.notifications.addNotification(notification2);

    const store = (instance as any).serviceManager.store;
    let state: AppState = store.getState();
    expect(state.notifications.length).toBeGreaterThan(0);

    // Remove all notifications
    instance.notifications.removeAllNotifications();

    state = store.getState();
    expect(state.notifications).toEqual([]);
  });
});

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../helpers/chatInstanceTestHelpers";

describe("ChatInstance.updateBotUnreadIndicatorVisibility", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should update bot unread indicator visibility to true in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateBotUnreadIndicatorVisibility(true);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.persistedToBrowserStorage.showUnreadIndicator).toBe(true);
  });

  it("should update bot unread indicator visibility to false in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateBotUnreadIndicatorVisibility(false);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.persistedToBrowserStorage.showUnreadIndicator).toBe(false);
  });

  it("should toggle unread indicator visibility and maintain correct Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test multiple toggles
    instance.updateBotUnreadIndicatorVisibility(true);
    let state = store.getState();
    expect(state.persistedToBrowserStorage.showUnreadIndicator).toBe(true);

    instance.updateBotUnreadIndicatorVisibility(false);
    state = store.getState();
    expect(state.persistedToBrowserStorage.showUnreadIndicator).toBe(false);

    instance.updateBotUnreadIndicatorVisibility(true);
    state = store.getState();
    expect(state.persistedToBrowserStorage.showUnreadIndicator).toBe(true);
  });
});

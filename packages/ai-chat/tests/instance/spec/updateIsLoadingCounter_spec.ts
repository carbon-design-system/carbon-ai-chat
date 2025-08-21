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

describe("ChatInstance.updateIsLoadingCounter", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should increase loading counter in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const initialState = store.getState();
    const initialCounter = initialState.botMessageState.isLoadingCounter;

    instance.updateIsLoadingCounter("increase");

    const updatedState = store.getState();
    expect(updatedState.botMessageState.isLoadingCounter).toBe(
      initialCounter + 1,
    );
  });

  it("should decrease loading counter in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First increase the counter so we can decrease it
    instance.updateIsLoadingCounter("increase");

    const stateAfterIncrease = store.getState();
    const counterAfterIncrease =
      stateAfterIncrease.botMessageState.isLoadingCounter;

    instance.updateIsLoadingCounter("decrease");

    const finalState = store.getState();
    expect(finalState.botMessageState.isLoadingCounter).toBe(
      counterAfterIncrease - 1,
    );
  });

  it("should not decrease loading counter below 0", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Try to decrease when counter is already at 0
    instance.updateIsLoadingCounter("decrease");

    const state = store.getState();
    expect(state.botMessageState.isLoadingCounter).toBe(0);
  });

  it("should handle multiple counter operations correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Get initial counter
    let state = store.getState();
    const initial = state.botMessageState.isLoadingCounter;

    // Increase multiple times
    instance.updateIsLoadingCounter("increase");
    instance.updateIsLoadingCounter("increase");
    state = store.getState();
    expect(state.botMessageState.isLoadingCounter).toBe(initial + 2);

    // Decrease once
    instance.updateIsLoadingCounter("decrease");
    state = store.getState();
    expect(state.botMessageState.isLoadingCounter).toBe(initial + 1);

    // Decrease to original
    instance.updateIsLoadingCounter("decrease");
    state = store.getState();
    expect(state.botMessageState.isLoadingCounter).toBe(initial);
  });
});

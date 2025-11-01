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
} from "../../test_helpers";

describe("ChatInstance.updateIsChatLoadingCounter", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should increase chat loading counter in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const initialState = store.getState();
    const initialCounter =
      initialState.assistantMessageState.isHydratingCounter;

    instance.updateIsChatLoadingCounter("increase");

    const updatedState = store.getState();
    expect(updatedState.assistantMessageState.isHydratingCounter).toBe(
      initialCounter + 1,
    );
  });

  it("should decrease chat loading counter in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First increase the counter so we can decrease it
    instance.updateIsChatLoadingCounter("increase");

    const stateAfterIncrease = store.getState();
    const counterAfterIncrease =
      stateAfterIncrease.assistantMessageState.isHydratingCounter;

    instance.updateIsChatLoadingCounter("decrease");

    const finalState = store.getState();
    expect(finalState.assistantMessageState.isHydratingCounter).toBe(
      counterAfterIncrease - 1,
    );
  });

  it("should not decrease chat loading counter below 0", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Try to decrease when counter is already at 0
    instance.updateIsChatLoadingCounter("decrease");

    const state = store.getState();
    expect(state.assistantMessageState.isHydratingCounter).toBe(0);
  });

  it("should handle multiple chat loading counter operations correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Get initial counter
    let state = store.getState();
    const initial = state.assistantMessageState.isHydratingCounter;

    // Increase multiple times
    instance.updateIsChatLoadingCounter("increase");
    instance.updateIsChatLoadingCounter("increase");
    state = store.getState();
    expect(state.assistantMessageState.isHydratingCounter).toBe(initial + 2);

    // Decrease once
    instance.updateIsChatLoadingCounter("decrease");
    state = store.getState();
    expect(state.assistantMessageState.isHydratingCounter).toBe(initial + 1);

    // Decrease to original
    instance.updateIsChatLoadingCounter("decrease");
    state = store.getState();
    expect(state.assistantMessageState.isHydratingCounter).toBe(initial);
  });
});

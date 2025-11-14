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

describe("ChatInstance.updateIsMessageLoadingCounter", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should increase loading counter in state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const initialState = store.getState();
    const initialCounter =
      initialState.assistantMessageState.isMessageLoadingCounter;

    instance.updateIsMessageLoadingCounter("increase");

    const updatedState = store.getState();
    expect(updatedState.assistantMessageState.isMessageLoadingCounter).toBe(
      initialCounter + 1,
    );
  });

  it("should add option message string to state and remove it when isMessageLoadingCounter is 0", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const initialState = store.getState();
    const initialCounter =
      initialState.assistantMessageState.isMessageLoadingCounter;

    instance.updateIsMessageLoadingCounter("increase", "Thinking...");

    const updatedState = store.getState();
    expect(updatedState.assistantMessageState.isMessageLoadingCounter).toBe(
      initialCounter + 1,
    );
    expect(updatedState.assistantMessageState.isMessageLoadingText).toBe(
      "Thinking...",
    );

    instance.updateIsMessageLoadingCounter("decrease");

    const finalState = store.getState();
    expect(finalState.assistantMessageState.isMessageLoadingCounter).toBe(0);
    expect(finalState.assistantMessageState.isMessageLoadingText).toBe(
      undefined,
    );
  });

  it("should decrease loading counter in state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First increase the counter so we can decrease it
    instance.updateIsMessageLoadingCounter("increase");

    const stateAfterIncrease = store.getState();
    const counterAfterIncrease =
      stateAfterIncrease.assistantMessageState.isMessageLoadingCounter;

    instance.updateIsMessageLoadingCounter("decrease");

    const finalState = store.getState();
    expect(finalState.assistantMessageState.isMessageLoadingCounter).toBe(
      counterAfterIncrease - 1,
    );
  });

  it("should reset loading counter in state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First increase the counter so we can reset it
    instance.updateIsMessageLoadingCounter("increase");
    instance.updateIsMessageLoadingCounter("increase");

    const stateAfterIncrease = store.getState();

    expect(
      stateAfterIncrease.assistantMessageState.isMessageLoadingCounter,
    ).toBe(2);

    instance.updateIsMessageLoadingCounter("reset");

    const finalState = store.getState();
    expect(finalState.assistantMessageState.isMessageLoadingCounter).toBe(0);
  });

  it("should not decrease loading counter below 0", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Try to decrease when counter is already at 0
    instance.updateIsMessageLoadingCounter("decrease");

    const state = store.getState();
    expect(state.assistantMessageState.isMessageLoadingCounter).toBe(0);
  });

  it("should handle multiple counter operations correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Get initial counter
    let state = store.getState();
    const initial = state.assistantMessageState.isMessageLoadingCounter;

    // Increase multiple times
    instance.updateIsMessageLoadingCounter("increase");
    instance.updateIsMessageLoadingCounter("increase");
    state = store.getState();
    expect(state.assistantMessageState.isMessageLoadingCounter).toBe(
      initial + 2,
    );

    // Decrease once
    instance.updateIsMessageLoadingCounter("decrease");
    state = store.getState();
    expect(state.assistantMessageState.isMessageLoadingCounter).toBe(
      initial + 1,
    );

    // Decrease to original
    instance.updateIsMessageLoadingCounter("decrease");
    state = store.getState();
    expect(state.assistantMessageState.isMessageLoadingCounter).toBe(initial);
  });
});

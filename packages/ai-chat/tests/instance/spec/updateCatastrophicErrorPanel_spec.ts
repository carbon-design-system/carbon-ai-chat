/*
 *  Copyright IBM Corp. 2026
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

describe("ChatInstance.updateCatastrophicErrorPanel", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateCatastrophicErrorPanel method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateCatastrophicErrorPanel).toBe("function");
  });

  it("should execute without throwing any errors", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() =>
      instance.updateCatastrophicErrorPanel({ isOpen: false }),
    ).not.toThrow();
  });

  it("should set catastrophicErrorType in app state to true when opening panel for the first time", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test catastrophicErrorType is initially undefined
    let state = store.getState();
    expect(state.catastrophicErrorType).toBe(undefined);

    // Test catastrophicErrorType is set to true after opening panel with updateCatastrophicErrorPanel()
    instance.updateCatastrophicErrorPanel({ isOpen: true });
    state = store.getState();
    expect(state.catastrophicErrorType).toBe(true);
  });

  it("should not set catastrophicErrorType in app state to true if not opening panel", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test catastrophicErrorType is initially undefined
    let state = store.getState();
    expect(state.catastrophicErrorType).toBe(undefined);

    // Test catastrophicErrorType is still undefined after calling updateCatastrophicErrorPanel() without setting isOpen to true
    instance.updateCatastrophicErrorPanel({
      isOpen: false,
      title: "Custom title",
      bodyText: "Custom body text",
    });
    state = store.getState();
    expect(state.catastrophicErrorType).toBe(undefined);
  });

  it("should correctly set custom title and body text on panel", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateCatastrophicErrorPanel({
      isOpen: true,
      title: "Custom title",
      bodyText: "Custom body text",
    });
    const state = store.getState();
    expect(state.catastrophicErrorPanelState.title).toBe("Custom title");
    expect(state.catastrophicErrorPanelState.bodyText).toBe("Custom body text");
  });
});

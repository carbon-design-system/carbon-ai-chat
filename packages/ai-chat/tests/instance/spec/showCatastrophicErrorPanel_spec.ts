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

describe("ChatInstance.showCatastrophicErrorPanel", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have showCatastrophicErrorPanel method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.showCatastrophicErrorPanel).toBe("function");
  });

  it("should execute without throwing any errors", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.showCatastrophicErrorPanel()).not.toThrow();
  });

  it("should set AppState.catastrophicErrorType to true", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test catastrophicErrorType is initially undefined
    let state = store.getState();
    expect(state.catastrophicErrorType).toBe(undefined);

    // Test catastrophicErrorType is set to true after executing showCatastrophicErrorPanel()
    instance.showCatastrophicErrorPanel();
    state = store.getState();
    expect(state.catastrophicErrorType).toBe(true);
  });
});

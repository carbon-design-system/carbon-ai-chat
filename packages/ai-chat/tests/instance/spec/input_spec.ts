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
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";

describe("ChatInstance.input", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("updates the raw input value", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateRawValue(() => "Hello");

    let state = store.getState();
    expect(state.assistantInputState.rawValue).toBe("Hello");
    expect(state.assistantInputState.displayValue).toBe("Hello");

    instance.input.updateRawValue((prev) => `${prev}, world`);

    state = store.getState();
    expect(state.assistantInputState.rawValue).toBe("Hello, world");
    expect(state.assistantInputState.displayValue).toBe("Hello, world");
  });
});

describe("PublicConfig.input", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("respects isVisible", async () => {
    const config = createBaseConfig();
    config.input = {
      ...config.input,
      isVisible: false,
    };

    const { store } = await renderChatAndGetInstanceWithStore(config);
    expect(store.getState().assistantInputState.fieldVisible).toBe(false);
  });

  it("respects isReadonly", async () => {
    const config = createBaseConfig();
    config.isReadonly = true;

    const { store } = await renderChatAndGetInstanceWithStore(config);
    expect(store.getState().assistantInputState.isReadonly).toBe(true);
  });
});

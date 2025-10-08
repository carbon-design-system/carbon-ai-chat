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

describe("ChatInstance.updateInputIsDisabled", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should update input disabled state to true in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateInputIsDisabled(true);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.assistantInputState.isReadonly).toBe(true);
  });

  it("should update input disabled state to false in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateInputIsDisabled(false);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.assistantInputState.isReadonly).toBe(false);
  });

  it("should toggle input disabled state and maintain correct Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test multiple toggles
    instance.updateInputIsDisabled(true);
    let state = store.getState();
    expect(state.assistantInputState.isReadonly).toBe(true);

    instance.updateInputIsDisabled(false);
    state = store.getState();
    expect(state.assistantInputState.isReadonly).toBe(false);

    instance.updateInputIsDisabled(true);
    state = store.getState();
    expect(state.assistantInputState.isReadonly).toBe(true);
  });
});

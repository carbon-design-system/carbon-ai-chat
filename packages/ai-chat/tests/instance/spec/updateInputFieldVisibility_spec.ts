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

describe("ChatInstance.updateInputFieldVisibility", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should update input field visibility to false in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateInputFieldVisibility(false);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.botInputState.fieldVisible).toBe(false);
  });

  it("should update input field visibility to true in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateInputFieldVisibility(true);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.botInputState.fieldVisible).toBe(true);
  });

  it("should toggle input field visibility and maintain correct Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test multiple toggles
    instance.updateInputFieldVisibility(false);
    let state = store.getState();
    expect(state.botInputState.fieldVisible).toBe(false);

    instance.updateInputFieldVisibility(true);
    state = store.getState();
    expect(state.botInputState.fieldVisible).toBe(true);

    instance.updateInputFieldVisibility(false);
    state = store.getState();
    expect(state.botInputState.fieldVisible).toBe(false);
  });
});

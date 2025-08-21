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

describe("ChatInstance.updateCustomMenuOptions", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should update custom menu options in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const customMenuOptions = [
      { text: "Option 1", handler: jest.fn() },
      { text: "Option 2", handler: jest.fn() },
    ];

    instance.updateCustomMenuOptions(customMenuOptions);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.customMenuOptions).toEqual(customMenuOptions);
  });

  it("should update with empty array", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateCustomMenuOptions([]);

    const state = store.getState();
    expect(state.customMenuOptions).toEqual([]);
  });

  it("should handle multiple updates correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const firstOptions = [{ text: "First", handler: jest.fn() }];
    instance.updateCustomMenuOptions(firstOptions);
    let state = store.getState();
    expect(state.customMenuOptions).toEqual(firstOptions);

    const secondOptions = [
      { text: "Second A", handler: jest.fn() },
      { text: "Second B", handler: jest.fn() },
    ];
    instance.updateCustomMenuOptions(secondOptions);
    state = store.getState();
    expect(state.customMenuOptions).toEqual(secondOptions);
  });
});

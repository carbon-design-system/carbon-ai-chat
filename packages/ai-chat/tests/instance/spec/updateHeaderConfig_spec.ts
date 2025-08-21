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
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../helpers/chatInstanceTestHelpers";

describe("ChatInstance.updateHeaderConfig", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateHeaderConfig method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateHeaderConfig).toBe("function");
  });

  it("should accept header configuration and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const headerConfig = {
      headerTitle: {
        title: "AI Assistant",
        name: "ChatBot",
      },
    };

    instance.updateHeaderConfig(headerConfig);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.chatHeaderState.config.headerTitle.title).toBe("AI Assistant");
    expect(state.chatHeaderState.config.headerTitle.name).toBe("ChatBot");
  });

  it("should accept minimal header configuration and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const minimalConfig = {
      headerTitle: {
        title: "Bot",
      },
    };

    instance.updateHeaderConfig(minimalConfig);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.chatHeaderState.config.headerTitle.title).toBe("Bot");
  });

  it("should handle multiple header config updates", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First update
    instance.updateHeaderConfig({
      headerTitle: { title: "First Title" },
    });
    let state = store.getState();
    expect(state.chatHeaderState.config.headerTitle.title).toBe("First Title");

    // Second update with name
    const secondConfig = {
      headerTitle: {
        title: "Second Title",
        name: "Assistant",
      },
    };
    instance.updateHeaderConfig(secondConfig);
    state = store.getState();
    expect(state.chatHeaderState.config.headerTitle.title).toBe("Second Title");
    expect(state.chatHeaderState.config.headerTitle.name).toBe("Assistant");
  });

  it("should accept configuration with empty headerTitle", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const configWithEmptyHeaderTitle = {
      headerTitle: {},
    };

    expect(() =>
      instance.updateHeaderConfig(configWithEmptyHeaderTitle),
    ).not.toThrow();
  });

  it("should accept minimal configuration", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const minimalConfig = {
      headerTitle: { title: "Simple Title" },
    };

    expect(() => instance.updateHeaderConfig(minimalConfig)).not.toThrow();
  });
});

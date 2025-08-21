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

describe("ChatInstance.updateLauncherConfig", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateLauncherConfig method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateLauncherConfig).toBe("function");
  });

  it("should accept launcher configuration and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const launcherConfig = {
      desktop: { title: "Chat with AI" },
      mobile: { title: "AI Chat" },
    };

    instance.updateLauncherConfig(launcherConfig);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.launcher.config.desktop?.title).toBe("Chat with AI");
    expect(state.launcher.config.mobile?.title).toBe("AI Chat");
  });

  it("should accept partial launcher configuration and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const partialConfig = {
      desktop: { title: "Updated Desktop Title" },
    };

    instance.updateLauncherConfig(partialConfig);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.launcher.config.desktop?.title).toBe("Updated Desktop Title");
  });

  it("should handle multiple launcher config updates", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First update
    instance.updateLauncherConfig({ desktop: { title: "First Title" } });
    let state = store.getState();
    expect(state.launcher.config.desktop?.title).toBe("First Title");

    // Second update
    instance.updateLauncherConfig({ mobile: { title: "Mobile Title" } });
    state = store.getState();
    expect(state.launcher.config.mobile?.title).toBe("Mobile Title");
    expect(state.launcher.config.desktop?.title).toBe("First Title"); // Should persist
  });

  it("should accept mobile-only configuration", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const mobileOnlyConfig = {
      mobile: { title: "Mobile Chat" },
    };

    expect(() => instance.updateLauncherConfig(mobileOnlyConfig)).not.toThrow();
  });

  it("should accept empty configuration", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.updateLauncherConfig({})).not.toThrow();
  });
});

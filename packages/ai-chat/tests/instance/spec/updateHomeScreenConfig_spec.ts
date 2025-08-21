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
import { HomeScreenBackgroundType } from "../../../src/types/config/HomeScreenConfig";

describe("ChatInstance.updateHomeScreenConfig", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateHomeScreenConfig method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateHomeScreenConfig).toBe("function");
  });

  it("should accept home screen configuration and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const homeScreenConfig = {
      greeting: "Welcome to AI Chat",
      starters: {
        is_on: true,
        buttons: [{ label: "Hello" }, { label: "Help" }],
      },
    };

    instance.updateHomeScreenConfig(homeScreenConfig);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.homeScreenConfig.greeting).toBe("Welcome to AI Chat");
    expect(state.homeScreenConfig.starters?.buttons).toEqual(
      homeScreenConfig.starters.buttons,
    );
  });

  it("should accept minimal home screen configuration", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const minimalConfig = {
      greeting: "Hello there!",
    };

    expect(() => instance.updateHomeScreenConfig(minimalConfig)).not.toThrow();
  });

  it("should accept configuration with background", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const configWithBackground = {
      greeting: "Welcome!",
      background: HomeScreenBackgroundType.SOLID,
    };

    expect(() =>
      instance.updateHomeScreenConfig(configWithBackground),
    ).not.toThrow();
  });

  it("should handle empty conversation starters and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const configWithEmptyStarters = {
      greeting: "Welcome!",
      starters: {
        is_on: true,
        buttons: [] as Array<{ label: string }>,
      },
    };

    instance.updateHomeScreenConfig(configWithEmptyStarters);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.homeScreenConfig.greeting).toBe("Welcome!");
    expect(state.homeScreenConfig.starters?.buttons).toEqual([]);
  });

  it("should handle multiple home screen config updates", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First update
    instance.updateHomeScreenConfig({ greeting: "First Message" });
    let state = store.getState();
    expect(state.homeScreenConfig.greeting).toBe("First Message");

    // Second update
    const secondConfig = {
      greeting: "Second Message",
      starters: {
        is_on: true,
        buttons: [{ label: "Start" }],
      },
    };
    instance.updateHomeScreenConfig(secondConfig);
    state = store.getState();
    expect(state.homeScreenConfig.greeting).toBe("Second Message");
    expect(state.homeScreenConfig.starters?.buttons).toEqual(
      secondConfig.starters.buttons,
    );
  });
});

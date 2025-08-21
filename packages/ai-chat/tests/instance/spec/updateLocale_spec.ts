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

describe("ChatInstance.updateLocale", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateLocale method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateLocale).toBe("function");
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.updateLocale("en-US");
    expect(result).toBeInstanceOf(Promise);
  });

  it("should accept valid locale strings", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.updateLocale("en")).resolves.not.toThrow();
    await expect(instance.updateLocale("en-US")).resolves.not.toThrow();
    await expect(instance.updateLocale("es-ES")).resolves.not.toThrow();
  });

  it("should handle locale change and update application state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Verify initial state
    let state = store.getState();
    const initialLocale = state.locale;

    await instance.updateLocale("es");

    // Verify that the locale was updated (internal format may differ from input)
    state = store.getState();
    expect(state.locale).not.toBe(initialLocale);
    expect(typeof state.locale).toBe("string");
    expect(state.locale.length).toBeGreaterThan(0);
  });

  it("should update locale multiple times correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test multiple locale changes - focus on functional behavior
    await instance.updateLocale("es-ES");
    let state = store.getState();
    const firstLocale = state.locale;

    await instance.updateLocale("fr-FR");
    state = store.getState();
    const secondLocale = state.locale;

    await instance.updateLocale("en-US");
    state = store.getState();
    const thirdLocale = state.locale;

    // Verify that each update changed the internal locale
    expect(firstLocale).not.toBe(secondLocale);
    expect(secondLocale).not.toBe(thirdLocale);
    expect(firstLocale).not.toBe(thirdLocale);

    // Verify they are all valid locale strings
    expect(typeof firstLocale).toBe("string");
    expect(typeof secondLocale).toBe("string");
    expect(typeof thirdLocale).toBe("string");
  });
});

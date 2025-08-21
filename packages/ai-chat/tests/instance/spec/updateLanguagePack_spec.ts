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

describe("ChatInstance.updateLanguagePack", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateLanguagePack method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateLanguagePack).toBe("function");
  });

  it("should accept partial language pack and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const partialPack = {
      input_buttonLabel: "Send Message",
    };

    instance.updateLanguagePack(partialPack);

    // Verify Redux state updated
    const state = store.getState();
    expect(state.languagePack.input_buttonLabel).toBe("Send Message");
    // Other properties should remain from initial pack
    expect(state.languagePack).toMatchObject(partialPack);
  });

  it("should accept empty object", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.updateLanguagePack({})).not.toThrow();
  });

  it("should accept multiple language pack properties and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const multiPack = {
      input_placeholder: "Custom placeholder",
      input_ariaLabel: "Custom aria label",
    };

    instance.updateLanguagePack(multiPack);

    // Verify Redux state updated with multiple properties
    const state = store.getState();
    expect(state.languagePack.input_placeholder).toBe("Custom placeholder");
    expect(state.languagePack.input_ariaLabel).toBe("Custom aria label");
  });

  it("should handle multiple language pack updates correctly", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First update
    instance.updateLanguagePack({ input_buttonLabel: "Enviar" });
    let state = store.getState();
    expect(state.languagePack.input_buttonLabel).toBe("Enviar");

    // Second update with different properties
    instance.updateLanguagePack({
      input_placeholder: "Escribe algo...",
    });
    state = store.getState();
    expect(state.languagePack.input_placeholder).toBe("Escribe algo...");
    expect(state.languagePack.input_buttonLabel).toBe("Enviar"); // Should persist
  });
});

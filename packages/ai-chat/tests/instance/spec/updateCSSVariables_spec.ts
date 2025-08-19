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
import { CSSVariable } from "../../../src/types/instance/ChatInstance";

describe("ChatInstance.updateCSSVariables", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateCSSVariables method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.updateCSSVariables).toBe("function");
  });

  it("should accept CSS variable updates", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const variables = {
      [CSSVariable.BASE_HEIGHT]: "400px",
      [CSSVariable.BASE_WIDTH]: "300px",
    };

    expect(() => instance.updateCSSVariables(variables)).not.toThrow();
  });

  it("should accept empty CSS variables object", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.updateCSSVariables({})).not.toThrow();
  });

  it("should accept individual CSS variables", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const variables = {
      [CSSVariable.BASE_MAX_HEIGHT]: "500px",
    };

    expect(() => instance.updateCSSVariables(variables)).not.toThrow();
  });

  it("should accept z-index updates", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const variables = {
      [CSSVariable.BASE_Z_INDEX]: "9999",
    };

    expect(() => instance.updateCSSVariables(variables)).not.toThrow();
  });

  it("should handle multiple CSS variable updates", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    // Test multiple updates
    const firstVariables = {
      [CSSVariable.BASE_HEIGHT]: "400px",
    };
    expect(() => instance.updateCSSVariables(firstVariables)).not.toThrow();

    const secondVariables = {
      [CSSVariable.BASE_WIDTH]: "350px",
      [CSSVariable.BASE_Z_INDEX]: "8888",
    };
    expect(() => instance.updateCSSVariables(secondVariables)).not.toThrow();
  });

  it("should handle CSS variable updates without throwing errors", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const variables = {
      [CSSVariable.BASE_HEIGHT]: "500px",
      [CSSVariable.BASE_WIDTH]: "400px",
      [CSSVariable.BASE_MAX_HEIGHT]: "600px",
      [CSSVariable.BASE_Z_INDEX]: "7777",
    };

    expect(() => instance.updateCSSVariables(variables)).not.toThrow();
  });
});

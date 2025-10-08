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
  setupBeforeEach,
  setupAfterEach,
} from "../helpers/chatInstanceTestHelpers";

describe("ChatInstance.requestFocus", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have requestFocus method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.requestFocus).toBe("function");
  });

  it("should execute without throwing", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.requestFocus()).not.toThrow();
  });

  it("should return boolean or void", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.requestFocus();
    expect(result === undefined || typeof result === "boolean").toBe(true);
  });
});

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

describe("ChatInstance.doAutoScroll", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have doAutoScroll method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.doAutoScroll).toBe("function");
  });

  it("should execute without parameters", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.doAutoScroll()).not.toThrow();
  });

  it("should execute without throwing errors", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // The public API doesn't accept parameters
    expect(() => instance.doAutoScroll()).not.toThrow();
  });

  it("should work when called multiple times", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => {
      instance.doAutoScroll();
      instance.doAutoScroll();
    }).not.toThrow();
  });
});

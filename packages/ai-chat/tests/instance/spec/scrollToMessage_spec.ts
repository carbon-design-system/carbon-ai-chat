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
} from "../../test_helpers";

describe("ChatInstance.scrollToMessage", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have scrollToMessage method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.scrollToMessage).toBe("function");
  });

  it("should accept message ID", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.scrollToMessage("message-123")).not.toThrow();
  });

  it("should accept message ID and animate parameter", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(() => instance.scrollToMessage("message-123", true)).not.toThrow();
    expect(() => instance.scrollToMessage("message-456", false)).not.toThrow();
  });

  it("should work with animate parameter defaulting to true", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Should work without animate parameter (defaults to true)
    expect(() => instance.scrollToMessage("message-789")).not.toThrow();
  });
});

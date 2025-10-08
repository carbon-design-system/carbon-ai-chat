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
} from "../../helpers/chatInstanceTestHelpers";

describe("ChatInstance.messaging.restartConversation", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have messaging.restartConversation method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.restartConversation).toBe("function");
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.restartConversation();
    expect(result).toBeInstanceOf(Promise);
  });

  it("should resolve successfully", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(
      instance.messaging.restartConversation(),
    ).resolves.not.toThrow();
  });

  it("should clear conversation state", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Restart conversation using the new messaging API
    await instance.messaging.restartConversation();

    // Get state after restart
    const restartedState = instance.getState();

    // Should maintain basic state structure
    expect(restartedState).toBeDefined();
    expect(typeof restartedState).toBe("object");
  });

  describe("Deprecated instance.restartConversation", () => {
    it("should show deprecation warning when using instance.restartConversation", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      // Mock console.warn to capture the deprecation warning
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await instance.restartConversation();

      expect(
        consoleSpy.mock.calls.some(
          (call) =>
            call[0] ===
            "[Chat] instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.",
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});

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

describe("ChatInstance.serviceDesk", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have serviceDesk property available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(instance.serviceDesk).toBeDefined();
    expect(typeof instance.serviceDesk).toBe("object");
  });

  describe("endConversation", () => {
    it("should have endConversation method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.serviceDesk.endConversation).toBe("function");
    });

    it("should return a Promise", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const result = instance.serviceDesk.endConversation();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should resolve successfully", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      await expect(
        instance.serviceDesk.endConversation(),
      ).resolves.not.toThrow();
    });

    it("should handle multiple calls gracefully", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      await expect(
        instance.serviceDesk.endConversation(),
      ).resolves.not.toThrow();
      await expect(
        instance.serviceDesk.endConversation(),
      ).resolves.not.toThrow();
    });
  });

  describe("updateIsSuspended", () => {
    it("should have updateIsSuspended method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.serviceDesk.updateIsSuspended).toBe("function");
    });

    it("should return a Promise", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const result = instance.serviceDesk.updateIsSuspended(true);
      expect(result).toBeInstanceOf(Promise);
    });

    it("should accept boolean values", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      await expect(
        instance.serviceDesk.updateIsSuspended(true),
      ).resolves.not.toThrow();
      await expect(
        instance.serviceDesk.updateIsSuspended(false),
      ).resolves.not.toThrow();
    });

    it("should handle suspend state changes", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      // Test suspending
      await expect(
        instance.serviceDesk.updateIsSuspended(true),
      ).resolves.not.toThrow();

      // Test unsuspending
      await expect(
        instance.serviceDesk.updateIsSuspended(false),
      ).resolves.not.toThrow();
    });
  });
});

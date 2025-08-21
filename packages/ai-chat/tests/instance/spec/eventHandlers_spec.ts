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

describe("ChatInstance Event Handlers", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe("on", () => {
    it("should have on method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.on).toBe("function");
    });

    it("should return the instance for method chaining", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };
      const result = instance.on(mockHandler);

      expect(result).toBe(instance);
    });

    it("should accept single handler", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };

      expect(() => instance.on(mockHandler)).not.toThrow();
    });

    it("should accept array of handlers", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandlers = [
        { type: "receive" as any, handler: jest.fn() },
        { type: "send" as any, handler: jest.fn() },
      ];

      expect(() => instance.on(mockHandlers)).not.toThrow();
    });
  });

  describe("off", () => {
    it("should have off method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.off).toBe("function");
    });

    it("should return the instance for method chaining", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };
      const result = instance.off(mockHandler);

      expect(result).toBe(instance);
    });

    it("should accept single handler", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };

      expect(() => instance.off(mockHandler)).not.toThrow();
    });

    it("should accept array of handlers", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandlers = [
        { type: "receive" as any, handler: jest.fn() },
        { type: "send" as any, handler: jest.fn() },
      ];

      expect(() => instance.off(mockHandlers)).not.toThrow();
    });
  });

  describe("once", () => {
    it("should have once method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.once).toBe("function");
    });

    it("should return the instance for method chaining", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };
      const result = instance.once(mockHandler);

      expect(result).toBe(instance);
    });

    it("should accept single handler", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandler = { type: "receive" as any, handler: jest.fn() };

      expect(() => instance.once(mockHandler)).not.toThrow();
    });

    it("should accept array of handlers", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mockHandlers = [
        { type: "receive" as any, handler: jest.fn() },
        { type: "send" as any, handler: jest.fn() },
      ];

      expect(() => instance.once(mockHandlers)).not.toThrow();
    });
  });
});

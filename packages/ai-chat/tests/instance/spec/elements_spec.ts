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

describe("ChatInstance.elements", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have elements property available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(instance.elements).toBeDefined();
    expect(typeof instance.elements).toBe("object");
  });

  describe("getMainWindow", () => {
    it("should have getMainWindow method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.elements.getMainWindow).toBe("function");
    });

    it("should return an object with addClassName and removeClassName methods", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mainWindow = instance.elements.getMainWindow();

      expect(mainWindow).toBeDefined();
      expect(typeof mainWindow.addClassName).toBe("function");
      expect(typeof mainWindow.removeClassName).toBe("function");
    });

    it("should allow adding and removing class names", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const mainWindow = instance.elements.getMainWindow();

      expect(() => mainWindow.addClassName("test-class")).not.toThrow();
      expect(() => mainWindow.removeClassName("test-class")).not.toThrow();
    });
  });

  describe("getMessageInput", () => {
    it("should have getMessageInput method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.elements.getMessageInput).toBe("function");
    });

    it("should return an input element interface", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const messageInput = instance.elements.getMessageInput();

      expect(messageInput).toBeDefined();
      expect(typeof messageInput.setValue).toBe("function");
      expect(typeof messageInput.setEnableEnterKey).toBe("function");
      expect(typeof messageInput.addChangeListener).toBe("function");
      expect(typeof messageInput.removeChangeListener).toBe("function");
    });

    it("should allow setting value", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const messageInput = instance.elements.getMessageInput();

      expect(() => messageInput.setValue("test message")).not.toThrow();
    });

    it("should allow managing change listeners", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const messageInput = instance.elements.getMessageInput();
      const mockListener = jest.fn();

      expect(() => messageInput.addChangeListener(mockListener)).not.toThrow();
      expect(() =>
        messageInput.removeChangeListener(mockListener),
      ).not.toThrow();
    });
  });

  describe("getHomeScreenInput", () => {
    it("should have getHomeScreenInput method available", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      expect(typeof instance.elements.getHomeScreenInput).toBe("function");
    });

    it("should return an input element interface", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const homeScreenInput = instance.elements.getHomeScreenInput();

      expect(homeScreenInput).toBeDefined();
      expect(typeof homeScreenInput.setValue).toBe("function");
      expect(typeof homeScreenInput.setEnableEnterKey).toBe("function");
      expect(typeof homeScreenInput.addChangeListener).toBe("function");
      expect(typeof homeScreenInput.removeChangeListener).toBe("function");
    });

    it("should allow setting value", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const homeScreenInput = instance.elements.getHomeScreenInput();

      expect(() =>
        homeScreenInput.setValue("home screen message"),
      ).not.toThrow();
    });

    it("should allow enabling/disabling enter key", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      const homeScreenInput = instance.elements.getHomeScreenInput();

      expect(() => homeScreenInput.setEnableEnterKey(true)).not.toThrow();
      expect(() => homeScreenInput.setEnableEnterKey(false)).not.toThrow();
    });
  });
});

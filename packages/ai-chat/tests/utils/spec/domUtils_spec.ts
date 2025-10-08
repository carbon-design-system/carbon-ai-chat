/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  isElement,
  isTextNode,
  isInputNode,
  isTextAreaNode,
  isImageNode,
  isEnterKey,
  getScrollBottom,
} from "../../../src/chat/utils/domUtils";

// Mock DOM environment
const createMockNode = (nodeType: number, tagName?: string) => ({
  nodeType,
  tagName,
});

const createMockKeyboardEvent = (key: string, modifiers = {}) => ({
  key,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ctrlKey: false,
  isComposing: false,
  keyCode: key === "Enter" ? 13 : 0,
  ...modifiers,
});

const createMockElement = (props = {}) => ({
  scrollHeight: 1000,
  offsetHeight: 300,
  scrollTop: 200,
  ...props,
});

describe("domUtils", () => {
  describe("isElement", () => {
    it("should return true for element nodes", () => {
      const elementNode = createMockNode(1) as any; // Node.ELEMENT_NODE = 1
      expect(isElement(elementNode)).toBe(true);
    });

    it("should return false for non-element nodes", () => {
      const textNode = createMockNode(3) as any; // Node.TEXT_NODE = 3
      const commentNode = createMockNode(8) as any; // Node.COMMENT_NODE = 8

      expect(isElement(textNode)).toBe(false);
      expect(isElement(commentNode)).toBe(false);
    });

    it("should handle null/undefined nodes", () => {
      expect(isElement(null as any)).toBe(false);
      expect(isElement(undefined as any)).toBe(false);
    });
  });

  describe("isTextNode", () => {
    it("should return true for text nodes", () => {
      const textNode = createMockNode(3) as any; // Node.TEXT_NODE = 3
      expect(isTextNode(textNode)).toBe(true);
    });

    it("should return false for non-text nodes", () => {
      const elementNode = createMockNode(1) as any; // Node.ELEMENT_NODE = 1
      expect(isTextNode(elementNode)).toBe(false);
    });
  });

  describe("isInputNode", () => {
    it("should return true for INPUT elements", () => {
      const inputNode = createMockNode(1, "INPUT") as any;
      expect(isInputNode(inputNode)).toBe(true);
    });

    it("should return false for non-INPUT elements", () => {
      const divNode = createMockNode(1, "DIV") as any;
      expect(isInputNode(divNode)).toBe(false);
    });
  });

  describe("isTextAreaNode", () => {
    it("should return true for TEXTAREA elements", () => {
      const textAreaNode = createMockNode(1, "TEXTAREA") as any;
      expect(isTextAreaNode(textAreaNode)).toBe(true);
    });

    it("should return false for non-TEXTAREA elements", () => {
      const divNode = createMockNode(1, "DIV") as any;
      expect(isTextAreaNode(divNode)).toBe(false);
    });
  });

  describe("isImageNode", () => {
    it("should return true for IMG elements", () => {
      const imgNode = createMockNode(1, "IMG") as any;
      expect(isImageNode(imgNode)).toBe(true);
    });

    it("should return false for non-IMG elements", () => {
      const divNode = createMockNode(1, "DIV") as any;
      expect(isImageNode(divNode)).toBe(false);
    });
  });

  describe("isEnterKey", () => {
    it("should return true for Enter key without modifiers", () => {
      const event = createMockKeyboardEvent("Enter");
      expect(isEnterKey(event as any)).toBe(true);
    });

    it("should return false for Enter key with modifiers", () => {
      const eventWithShift = createMockKeyboardEvent("Enter", {
        shiftKey: true,
      });
      const eventWithCtrl = createMockKeyboardEvent("Enter", { ctrlKey: true });
      const eventWithAlt = createMockKeyboardEvent("Enter", { altKey: true });
      const eventWithMeta = createMockKeyboardEvent("Enter", { metaKey: true });

      expect(isEnterKey(eventWithShift as any)).toBe(false);
      expect(isEnterKey(eventWithCtrl as any)).toBe(false);
      expect(isEnterKey(eventWithAlt as any)).toBe(false);
      expect(isEnterKey(eventWithMeta as any)).toBe(false);
    });

    it("should return false for non-Enter keys", () => {
      const spaceEvent = createMockKeyboardEvent("Space");
      const escapeEvent = createMockKeyboardEvent("Escape");

      expect(isEnterKey(spaceEvent as any)).toBe(false);
      expect(isEnterKey(escapeEvent as any)).toBe(false);
    });

    it("should return false for IME composition", () => {
      const event = createMockKeyboardEvent("Enter", { isComposing: true });
      expect(isEnterKey(event as any)).toBe(false);
    });

    it("should return false for keyCode 229 (IME)", () => {
      const event = createMockKeyboardEvent("Enter", { keyCode: 229 });
      expect(isEnterKey(event as any)).toBe(false);
    });
  });

  describe("getScrollBottom", () => {
    it("should calculate scroll bottom correctly", () => {
      const element = createMockElement({
        scrollHeight: 1000,
        offsetHeight: 300,
        scrollTop: 200,
      }) as any;

      // scrollBottom = scrollHeight - offsetHeight - scrollTop
      // 1000 - 300 - 200 = 500
      expect(getScrollBottom(element)).toBe(500);
    });

    it("should return 0 when scrolled to bottom", () => {
      const element = createMockElement({
        scrollHeight: 1000,
        offsetHeight: 300,
        scrollTop: 700, // scrollHeight - offsetHeight
      }) as any;

      expect(getScrollBottom(element)).toBe(0);
    });

    it("should return 0 for null element", () => {
      expect(getScrollBottom(null as any)).toBe(0);
    });

    it("should return 0 for undefined element", () => {
      expect(getScrollBottom(undefined as any)).toBe(0);
    });

    it("should handle elements with no scroll", () => {
      const element = createMockElement({
        scrollHeight: 300,
        offsetHeight: 300,
        scrollTop: 0,
      }) as any;

      expect(getScrollBottom(element)).toBe(0);
    });
  });
});

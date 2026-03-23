/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { nodeToText } from "../../../src/chat/utils/domUtils";

describe("nodeToText", () => {
  describe("text extraction", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("should extract text from simple text nodes", () => {
      const textNode = document.createTextNode("Hello World");
      const strings: string[] = [];

      nodeToText(textNode, strings);

      expect(strings).toEqual(["Hello World"]);
    });

    it("should extract text from elements with text content", () => {
      const div = document.createElement("div");
      div.textContent = "Test content";
      const strings: string[] = [];

      nodeToText(div, strings);

      expect(strings).toEqual(["Test content"]);
    });

    it("should skip elements with aria-hidden='true'", () => {
      const div = document.createElement("div");
      div.setAttribute("aria-hidden", "true");
      div.textContent = "Hidden content";
      const strings: string[] = [];

      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it("should skip elements with display:none", () => {
      const div = document.createElement("div");
      div.style.display = "none";
      div.textContent = "Hidden content";
      const strings: string[] = [];

      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it("should extract aria-label from elements", () => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", "Click me");
      button.textContent = "Button text";
      const strings: string[] = [];

      nodeToText(button, strings);

      // Buttons are skipped but aria-label should not be extracted for buttons
      expect(strings).toEqual([]);
    });

    it("should skip button elements", () => {
      const button = document.createElement("button");
      button.textContent = "Click me";
      const strings: string[] = [];

      nodeToText(button, strings);

      expect(strings).toEqual([]);
    });

    it("should skip elements with role='button'", () => {
      const div = document.createElement("div");
      div.setAttribute("role", "button");
      div.textContent = "Click me";
      const strings: string[] = [];

      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it("should process slot elements and their assigned nodes", () => {
      // Create a custom element with shadow DOM
      const host = document.createElement("div");
      const shadowRoot = host.attachShadow({ mode: "open" });

      // Create a slot in the shadow DOM
      const slot = document.createElement("slot");
      shadowRoot.appendChild(slot);

      // Create slotted content in the light DOM
      const slottedText = document.createTextNode("Slotted content");
      host.appendChild(slottedText);

      document.body.appendChild(host);

      const strings: string[] = [];
      nodeToText(slot, strings);

      expect(strings).toEqual(["Slotted content"]);
    });

    it("should skip slots inside aria-hidden parent containers", () => {
      // Create a custom element with shadow DOM
      const host = document.createElement("div");
      const shadowRoot = host.attachShadow({ mode: "open" });

      // Create a container with aria-hidden="true"
      const hiddenContainer = document.createElement("div");
      hiddenContainer.setAttribute("aria-hidden", "true");

      // Create a slot inside the hidden container
      const slot = document.createElement("slot");
      hiddenContainer.appendChild(slot);
      shadowRoot.appendChild(hiddenContainer);

      // Create slotted content in the light DOM
      const slottedText = document.createTextNode("This should not be read");
      host.appendChild(slottedText);

      document.body.appendChild(host);

      const strings: string[] = [];
      nodeToText(slot, strings);

      // The slot should be skipped because its parent has aria-hidden="true"
      expect(strings).toEqual([]);
    });

    it("should process slots when parent does not have aria-hidden", () => {
      // Create a custom element with shadow DOM
      const host = document.createElement("div");
      const shadowRoot = host.attachShadow({ mode: "open" });

      // Create a visible container
      const container = document.createElement("div");

      // Create a slot inside the visible container
      const slot = document.createElement("slot");
      container.appendChild(slot);
      shadowRoot.appendChild(container);

      // Create slotted content in the light DOM
      const slottedText = document.createTextNode("This should be read");
      host.appendChild(slottedText);

      document.body.appendChild(host);

      const strings: string[] = [];
      nodeToText(slot, strings);

      // The slot should be processed normally
      expect(strings).toEqual(["This should be read"]);
    });

    it("should handle nested elements correctly", () => {
      const outer = document.createElement("div");
      const inner = document.createElement("span");
      inner.textContent = "Inner text";
      outer.appendChild(inner);

      const strings: string[] = [];
      nodeToText(outer, strings);

      expect(strings).toEqual(["Inner text"]);
    });

    it("should handle elements with data-cds-aichat-exclude-node-read attribute", () => {
      const div = document.createElement("div");
      div.setAttribute("data-cds-aichat-exclude-node-read", "");
      div.textContent = "Excluded content";

      const strings: string[] = [];
      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it("should extract alt text from images", () => {
      const img = document.createElement("img");
      img.setAttribute("alt", "Image description");

      const strings: string[] = [];
      nodeToText(img, strings);

      expect(strings).toEqual(["Image description"]);
    });

    it("should extract value from input elements", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Input value";

      const strings: string[] = [];
      nodeToText(input, strings);

      expect(strings).toEqual(["Input value"]);
    });

    it("should extract placeholder from empty input elements", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Enter text";
      input.value = "";

      const strings: string[] = [];
      nodeToText(input, strings);

      expect(strings).toEqual(["Enter text"]);
    });

    it("should handle complex shadow DOM structures like markdown component", () => {
      // Simulate the cds-aichat-markdown structure
      const host = document.createElement("div");
      const shadowRoot = host.attachShadow({ mode: "open" });

      // Create the rendered content div (visible)
      const renderedDiv = document.createElement("div");
      renderedDiv.className = "cds-aichat-markdown-stack";
      renderedDiv.textContent = "Rendered markdown content";
      shadowRoot.appendChild(renderedDiv);

      // Create the hidden slot container (should be skipped)
      const hiddenContainer = document.createElement("div");
      hiddenContainer.setAttribute("aria-hidden", "true");
      hiddenContainer.setAttribute("hidden", "");

      const slot = document.createElement("slot");
      hiddenContainer.appendChild(slot);
      shadowRoot.appendChild(hiddenContainer);

      // Add the original markdown text to light DOM (slotted content)
      const originalText = document.createTextNode("Original markdown text");
      host.appendChild(originalText);

      document.body.appendChild(host);

      // Process the entire host element
      const strings: string[] = [];
      nodeToText(host, strings);

      // Should only get the rendered content, not the slotted content
      expect(strings).toEqual(["Rendered markdown content"]);
      expect(strings).not.toContain("Original markdown text");
    });

    it("should handle chain-of-thought scenario with aria-hidden steps", () => {
      // Simulate a message with chain-of-thought steps
      const messageContainer = document.createElement("div");
      messageContainer.className = "cds-aichat--message";

      // Create reasoning steps container with aria-hidden="true" (closed state)
      const reasoningSteps = document.createElement("div");
      reasoningSteps.className = "cds-aichat--message__reasoning-steps";
      reasoningSteps.setAttribute("aria-hidden", "true");

      const step1 = document.createElement("div");
      step1.textContent = "Step 1: Analyzing the question...";
      reasoningSteps.appendChild(step1);

      const step2 = document.createElement("div");
      step2.textContent = "Step 2: Searching knowledge base...";
      reasoningSteps.appendChild(step2);

      messageContainer.appendChild(reasoningSteps);

      // Create the actual message content
      const messageContent = document.createElement("div");
      messageContent.className = "message-content";
      messageContent.textContent = "Here is the answer to your question.";
      messageContainer.appendChild(messageContent);

      document.body.appendChild(messageContainer);

      const strings: string[] = [];
      nodeToText(messageContainer, strings);

      // Should only get the message content, not the hidden reasoning steps
      expect(strings).toEqual(["Here is the answer to your question."]);
      expect(strings).not.toContain("Step 1");
      expect(strings).not.toContain("Step 2");
      expect(strings).not.toContain("Analyzing the question");
      expect(strings).not.toContain("Searching knowledge base");
    });

    it("should include chain-of-thought steps when aria-hidden is not set (open state)", () => {
      // Simulate a message with chain-of-thought steps that are open
      const messageContainer = document.createElement("div");
      messageContainer.className = "cds-aichat--message";

      // Create reasoning steps container WITHOUT aria-hidden (open state)
      const reasoningSteps = document.createElement("div");
      reasoningSteps.className = "cds-aichat--message__reasoning-steps";
      // Note: No aria-hidden attribute when open

      const step1 = document.createElement("div");
      step1.textContent = "Step 1: Analyzing the question...";
      reasoningSteps.appendChild(step1);

      const step2 = document.createElement("div");
      step2.textContent = "Step 2: Searching knowledge base...";
      reasoningSteps.appendChild(step2);

      messageContainer.appendChild(reasoningSteps);

      // Create the actual message content
      const messageContent = document.createElement("div");
      messageContent.className = "message-content";
      messageContent.textContent = "Here is the answer to your question.";
      messageContainer.appendChild(messageContent);

      document.body.appendChild(messageContainer);

      const strings: string[] = [];
      nodeToText(messageContainer, strings);

      // Should get both the reasoning steps AND the message content
      expect(strings).toContain("Step 1: Analyzing the question...");
      expect(strings).toContain("Step 2: Searching knowledge base...");
      expect(strings).toContain("Here is the answer to your question.");
    });

    it("should skip nested content within aria-hidden='true' element", () => {
      const container = document.createElement("div");

      const visibleText = document.createElement("span");
      visibleText.textContent = "Visible";
      container.appendChild(visibleText);

      const hiddenSection = document.createElement("div");
      hiddenSection.setAttribute("aria-hidden", "true");

      const deeplyNested = document.createElement("div");
      const deeperNested = document.createElement("span");
      deeperNested.textContent = "Deeply nested hidden";
      deeplyNested.appendChild(deeperNested);
      hiddenSection.appendChild(deeplyNested);

      container.appendChild(hiddenSection);

      document.body.appendChild(container);

      const strings: string[] = [];
      nodeToText(container, strings);

      expect(strings).toEqual(["Visible"]);
      expect(strings).not.toContain("Deeply nested hidden");
    });
  });
});

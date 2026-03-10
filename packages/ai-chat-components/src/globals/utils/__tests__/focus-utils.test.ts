/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import {
  isElementInvisible,
  isFocusable,
  tryFocus,
  walkComposedTree,
  getFirstAndLastFocusableChildren,
} from "../focus-utils.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("focus-utils", function () {
  describe("isElementInvisible", function () {
    it("should return false for visible elements", async () => {
      const el = await fixture<HTMLDivElement>(html`<div>Visible</div>`);
      expect(isElementInvisible(el)).to.be.false;
    });

    it("should return true for elements with display:none", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div style="display: none;">Hidden</div>`,
      );
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return true for elements with visibility:hidden", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div style="visibility: hidden;">Hidden</div>`,
      );
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return true for elements with hidden attribute", async () => {
      const el = await fixture<HTMLDivElement>(html`<div hidden>Hidden</div>`);
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return true for elements with disabled attribute", async () => {
      const el = await fixture<HTMLButtonElement>(
        html`<button disabled>Disabled</button>`,
      );
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return true for elements with inert attribute", async () => {
      const el = await fixture<HTMLDivElement>(html`<div inert>Inert</div>`);
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return true for elements with aria-hidden=true", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div aria-hidden="true">Hidden</div>`,
      );
      expect(isElementInvisible(el)).to.be.true;
    });

    it("should return false for dialog elements by default (exception)", async () => {
      const el = await fixture<HTMLDialogElement>(
        html`<dialog hidden>Dialog</dialog>`,
      );
      expect(isElementInvisible(el)).to.be.false;
    });

    it("should return false for popover elements by default (exception)", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div popover hidden>Popover</div>`,
      );
      expect(isElementInvisible(el)).to.be.false;
    });

    it("should respect custom exceptions", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div class="custom" hidden>Custom</div>`,
      );
      expect(isElementInvisible(el, [".custom"])).to.be.false;
    });

    it("should return false for non-HTMLElement", async () => {
      const el = document.createTextNode("text");
      expect(isElementInvisible(el as any)).to.be.false;
    });

    it("should return false for null/undefined", async () => {
      expect(isElementInvisible(null as any)).to.be.false;
      expect(isElementInvisible(undefined as any)).to.be.false;
    });
  });

  describe("isFocusable", function () {
    it("should return true for anchor with href", async () => {
      const el = await fixture<HTMLAnchorElement>(
        html`<a href="#test">Link</a>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return false for anchor without href", async () => {
      const el = await fixture<HTMLAnchorElement>(html`<a>Not a link</a>`);
      expect(isFocusable(el)).to.be.false;
    });

    it("should return true for enabled button", async () => {
      const el = await fixture<HTMLButtonElement>(html`<button>Click</button>`);
      expect(isFocusable(el)).to.be.true;
    });

    it("should return false for disabled button", async () => {
      const el = await fixture<HTMLButtonElement>(
        html`<button disabled>Disabled</button>`,
      );
      expect(isFocusable(el)).to.be.false;
    });

    it("should return true for enabled input", async () => {
      const el = await fixture<HTMLInputElement>(html`<input type="text" />`);
      expect(isFocusable(el)).to.be.true;
    });

    it("should return false for disabled input", async () => {
      const el = await fixture<HTMLInputElement>(
        html`<input type="text" disabled />`,
      );
      expect(isFocusable(el)).to.be.false;
    });

    it("should return true for enabled select", async () => {
      const el = await fixture<HTMLSelectElement>(
        html`<select>
          <option>Option</option>
        </select>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return true for enabled textarea", async () => {
      const el = await fixture<HTMLTextAreaElement>(
        html`<textarea></textarea>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return true for elements with tabindex=0", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div tabindex="0">Focusable</div>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return false for elements with negative tabindex", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div tabindex="-1">Not focusable</div>`,
      );
      expect(isFocusable(el)).to.be.false;
    });

    it("should return true for contentEditable elements", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div contenteditable="true">Editable</div>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return true for details element", async () => {
      const el = await fixture<HTMLDetailsElement>(
        html`<details><summary>Summary</summary></details>`,
      );
      expect(isFocusable(el)).to.be.true;
    });

    it("should return true for iframe", async () => {
      const el = await fixture<HTMLIFrameElement>(html`<iframe></iframe>`);
      expect(isFocusable(el)).to.be.true;
    });

    it("should return false for disabled custom element", async () => {
      const el = await fixture<HTMLElement>(
        html`<custom-element disabled></custom-element>`,
      );
      expect(isFocusable(el)).to.be.false;
    });

    it("should return false for custom element with aria-disabled", async () => {
      const el = await fixture<HTMLElement>(
        html`<custom-element aria-disabled="true"></custom-element>`,
      );
      expect(isFocusable(el)).to.be.false;
    });

    it("should return false for non-HTMLElement", async () => {
      const el = document.createTextNode("text");
      expect(isFocusable(el as any)).to.be.false;
    });

    it("should return false for regular div without tabindex", async () => {
      const el = await fixture<HTMLDivElement>(html`<div>Not focusable</div>`);
      expect(isFocusable(el)).to.be.false;
    });
  });

  describe("tryFocus", function () {
    it("should successfully focus a focusable element", async () => {
      const el = await fixture<HTMLButtonElement>(html`<button>Click</button>`);
      const result = tryFocus(el);
      expect(result).to.be.true;
      expect(document.activeElement).to.equal(el);
    });

    it("should return false for null element", async () => {
      const result = tryFocus(null);
      expect(result).to.be.false;
    });

    it("should return false for undefined element", async () => {
      const result = tryFocus(undefined);
      expect(result).to.be.false;
    });

    it("should return false for non-HTMLElement", async () => {
      const el = document.createTextNode("text");
      const result = tryFocus(el as any);
      expect(result).to.be.false;
    });

    it("should return false for invisible element", async () => {
      const el = await fixture<HTMLButtonElement>(
        html`<button style="display: none;">Hidden</button>`,
      );
      const result = tryFocus(el);
      expect(result).to.be.false;
    });

    it("should return false for disabled element", async () => {
      const el = await fixture<HTMLButtonElement>(
        html`<button disabled>Disabled</button>`,
      );
      const result = tryFocus(el);
      expect(result).to.be.false;
    });

    it("should return false for non-focusable element", async () => {
      const el = await fixture<HTMLDivElement>(html`<div>Not focusable</div>`);
      const result = tryFocus(el);
      expect(result).to.be.false;
    });

    it("should focus element with tabindex=0", async () => {
      const el = await fixture<HTMLDivElement>(
        html`<div tabindex="0">Focusable</div>`,
      );
      const result = tryFocus(el);
      expect(result).to.be.true;
      expect(document.activeElement).to.equal(el);
    });

    it("should respect exceptions for invisible elements", async () => {
      const el = await fixture<HTMLDialogElement>(
        html`<dialog hidden><button>Button</button></dialog>`,
      );
      // Dialog is hidden but should be ignored due to default exceptions
      const button = el.querySelector("button") as HTMLButtonElement;
      const result = tryFocus(button);
      // Button inside hidden dialog should still be considered invisible
      expect(result).to.be.false;
    });

    it("should handle multiple focusable elements", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
        </div>
      `);
      const btn1 = container.querySelector("#btn1") as HTMLButtonElement;
      const btn2 = container.querySelector("#btn2") as HTMLButtonElement;

      const result1 = tryFocus(btn1);
      expect(result1).to.be.true;
      expect(document.activeElement).to.equal(btn1);

      const result2 = tryFocus(btn2);
      expect(result2).to.be.true;
      expect(document.activeElement).to.equal(btn2);
    });
  });

  describe("walkComposedTree", function () {
    it("should traverse all nodes in a simple tree", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <span>Text 1</span>
          <span>Text 2</span>
        </div>
      `);

      const nodes: Node[] = [];
      for (const node of walkComposedTree(container)) {
        nodes.push(node);
      }

      expect(nodes.length).to.be.greaterThan(0);
      expect(nodes[0]).to.equal(container);
    });

    it("should filter nodes based on filter function", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <button>Button</button>
          <span>Span</span>
          <button>Button 2</button>
        </div>
      `);

      const buttons: Node[] = [];
      for (const node of walkComposedTree(
        container,
        0,
        (node) =>
          node instanceof HTMLElement &&
          node.tagName.toLowerCase() === "button",
      )) {
        buttons.push(node);
      }

      expect(buttons.length).to.equal(2);
    });

    it("should skip nodes based on skipNode function", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <div class="skip">
            <button>Skipped Button</button>
          </div>
          <button>Visible Button</button>
        </div>
      `);

      const nodes: Node[] = [];
      for (const node of walkComposedTree(
        container,
        0,
        () => true,
        (node) =>
          node instanceof HTMLElement && node.classList.contains("skip"),
      )) {
        nodes.push(node);
      }

      // Should not include the .skip div or its children
      const hasSkippedButton = nodes.some(
        (node) =>
          node instanceof HTMLElement && node.textContent === "Skipped Button",
      );
      expect(hasSkippedButton).to.be.false;
    });

    it("should handle empty container", async () => {
      const container = await fixture<HTMLDivElement>(html`<div></div>`);

      const nodes: Node[] = [];
      for (const node of walkComposedTree(container)) {
        nodes.push(node);
      }

      expect(nodes.length).to.equal(1);
      expect(nodes[0]).to.equal(container);
    });

    it("should filter by node type", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <span>Text</span>
        </div>
      `);

      const elementNodes: Node[] = [];
      for (const node of walkComposedTree(container, Node.ELEMENT_NODE)) {
        elementNodes.push(node);
      }

      // All nodes should be element nodes
      elementNodes.forEach((node) => {
        expect(node.nodeType).to.equal(Node.ELEMENT_NODE);
      });
    });
  });

  describe("getFirstAndLastFocusableChildren", function () {
    it("should return first and last focusable children", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <button id="first">First</button>
          <button id="middle">Middle</button>
          <button id="last">Last</button>
        </div>
      `);

      const walker = walkComposedTree(
        container,
        0,
        (node) => node instanceof HTMLElement && isFocusable(node),
      ) as IterableIterator<HTMLElement>;

      const [first, last] = getFirstAndLastFocusableChildren(walker);

      expect(first).to.not.be.null;
      expect(last).to.not.be.null;
      expect(first?.id).to.equal("first");
      expect(last?.id).to.equal("last");
    });

    it("should return same element when only one focusable child", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <button id="only">Only Button</button>
        </div>
      `);

      const walker = walkComposedTree(
        container,
        0,
        (node) => node instanceof HTMLElement && isFocusable(node),
      ) as IterableIterator<HTMLElement>;

      const [first, last] = getFirstAndLastFocusableChildren(walker);

      expect(first).to.not.be.null;
      expect(last).to.not.be.null;
      expect(first).to.equal(last);
      expect(first?.id).to.equal("only");
    });

    it("should return null for both when no focusable children", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <span>Not focusable</span>
          <div>Also not focusable</div>
        </div>
      `);

      const walker = walkComposedTree(
        container,
        0,
        (node) => node instanceof HTMLElement && isFocusable(node),
      ) as IterableIterator<HTMLElement>;

      const [first, last] = getFirstAndLastFocusableChildren(walker);

      expect(first).to.be.null;
      expect(last).to.be.null;
    });

    it("should handle mixed focusable and non-focusable elements", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <span>Not focusable</span>
          <button id="first">First Button</button>
          <div>Not focusable</div>
          <input id="middle" type="text" />
          <span>Not focusable</span>
          <a id="last" href="#test">Link</a>
        </div>
      `);

      const walker = walkComposedTree(
        container,
        0,
        (node) => node instanceof HTMLElement && isFocusable(node),
      ) as IterableIterator<HTMLElement>;

      const [first, last] = getFirstAndLastFocusableChildren(walker);

      expect(first).to.not.be.null;
      expect(last).to.not.be.null;
      expect(first?.id).to.equal("first");
      expect(last?.id).to.equal("last");
    });

    it("should skip disabled elements", async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <button id="first">First</button>
          <button disabled>Disabled</button>
          <button id="last">Last</button>
        </div>
      `);

      const walker = walkComposedTree(
        container,
        0,
        (node) => node instanceof HTMLElement && isFocusable(node),
      ) as IterableIterator<HTMLElement>;

      const [first, last] = getFirstAndLastFocusableChildren(walker);

      expect(first).to.not.be.null;
      expect(last).to.not.be.null;
      expect(first?.id).to.equal("first");
      expect(last?.id).to.equal("last");
    });
  });
});

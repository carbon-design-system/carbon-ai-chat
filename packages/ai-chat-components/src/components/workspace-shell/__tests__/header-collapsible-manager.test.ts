/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { HeaderCollapsibleManager } from "../src/header-collapsible-manager.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const createMockElement = (height: number): HTMLElement => {
  const el = document.createElement("div");
  Object.defineProperty(el, "offsetHeight", {
    configurable: true,
    get: () => height,
  });
  return el;
};

const createMockSlot = (
  slotName: string,
  elements: HTMLElement[],
): HTMLSlotElement => {
  const slot = document.createElement("slot") as HTMLSlotElement;
  slot.setAttribute("name", slotName);
  slot.assignedElements = () => elements;
  return slot;
};

const createMockShadowRoot = (slots: {
  [key: string]: HTMLElement[];
}): ShadowRoot => {
  const shadowRoot = document.createElement("div") as unknown as ShadowRoot;
  shadowRoot.querySelector = (selector: string) => {
    const match = selector.match(/slot\[name="([^"]+)"\]/);
    if (match) {
      const slotName = match[1];
      if (slots[slotName]) {
        return createMockSlot(slotName, slots[slotName]);
      }
    }
    return null;
  };
  return shadowRoot;
};

describe("HeaderCollapsibleManager", () => {
  let hostElement: HTMLElement;
  let shadowRoot: ShadowRoot;
  let manager: HeaderCollapsibleManager;
  let stateChanges: any[];

  beforeEach(() => {
    stateChanges = [];
    hostElement = createMockElement(600);
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    manager?.disconnect();
    if (hostElement.parentNode) {
      document.body.removeChild(hostElement);
    }
  });

  it("should create a manager instance", () => {
    shadowRoot = createMockShadowRoot({});
    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    expect(manager).to.exist;
  });

  it("should calculate shouldCollapse as true when body would be smaller than header", () => {
    const toolbar = createMockElement(50);
    const notification = createMockElement(40);
    const header = createMockElement(150);
    const footer = createMockElement(80);

    shadowRoot = createMockShadowRoot({
      toolbar: [toolbar],
      notification: [notification],
      header: [header],
      footer: [footer],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.connect((state) => {
      stateChanges.push(state);
    });

    // Wait for initial calculation
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(stateChanges.length).to.be.greaterThan(0);
        const lastState = stateChanges[stateChanges.length - 1];

        // Total: 600, Used: 50+40+150+80 = 320, Available for body: 280
        // Body (280) > Header (150), so should NOT collapse
        expect(lastState.shouldCollapse).to.be.false;
        expect(lastState.availableBodyHeight).to.equal(280);
        expect(lastState.headerHeight).to.equal(150);
        resolve();
      }, 100);
    });
  });

  it("should calculate shouldCollapse as false when body would be larger than header", () => {
    const toolbar = createMockElement(50);
    const notification = createMockElement(40);
    const header = createMockElement(100);
    const footer = createMockElement(80);

    shadowRoot = createMockShadowRoot({
      toolbar: [toolbar],
      notification: [notification],
      header: [header],
      footer: [footer],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.connect((state) => {
      stateChanges.push(state);
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(stateChanges.length).to.be.greaterThan(0);
        const lastState = stateChanges[stateChanges.length - 1];

        // Total: 600, Used: 50+40+100+80 = 270, Available for body: 330
        // Body (330) > Header (100), so should NOT collapse
        expect(lastState.shouldCollapse).to.be.false;
        expect(lastState.availableBodyHeight).to.equal(330);
        expect(lastState.headerHeight).to.equal(100);
        resolve();
      }, 100);
    });
  });

  it("should handle empty slots gracefully", () => {
    shadowRoot = createMockShadowRoot({
      toolbar: [],
      notification: [],
      header: [],
      footer: [],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.connect((state) => {
      stateChanges.push(state);
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(stateChanges.length).to.be.greaterThan(0);
        const lastState = stateChanges[stateChanges.length - 1];

        // All slots empty, so available body height equals total height
        expect(lastState.availableBodyHeight).to.equal(600);
        expect(lastState.headerHeight).to.equal(0);
        expect(lastState.shouldCollapse).to.be.false;
        resolve();
      }, 100);
    });
  });

  it("should update header collapsible attribute when shouldCollapse is true", () => {
    const headerElement = document.createElement("div");

    shadowRoot = createMockShadowRoot({
      toolbar: [createMockElement(50)],
      notification: [createMockElement(40)],
      header: [headerElement],
      footer: [createMockElement(80)],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.updateHeaderCollapsible(true);

    expect(headerElement.hasAttribute("collapsible")).to.be.true;
  });

  it("should remove header collapsible attribute when shouldCollapse is false", () => {
    const headerElement = document.createElement("div");

    shadowRoot = createMockShadowRoot({
      toolbar: [createMockElement(50)],
      notification: [createMockElement(40)],
      header: [headerElement],
      footer: [createMockElement(80)],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);

    // First set it via the manager
    manager.updateHeaderCollapsible(true);
    expect(headerElement.hasAttribute("collapsible")).to.be.true;

    // Then remove it via the manager
    manager.updateHeaderCollapsible(false);
    expect(headerElement.hasAttribute("collapsible")).to.be.false;
  });

  it("should not update header if it has manual override", () => {
    const headerElement = document.createElement("div");
    headerElement.setAttribute("collapsible", "true");

    shadowRoot = createMockShadowRoot({
      toolbar: [createMockElement(50)],
      notification: [createMockElement(40)],
      header: [headerElement],
      footer: [createMockElement(80)],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);

    // hasManualOverride should return true
    expect(manager.hasManualOverride()).to.be.true;

    // Try to update - should not change because of manual override
    manager.updateHeaderCollapsible(false);

    // Attribute should still be present
    expect(headerElement.hasAttribute("collapsible")).to.be.true;
  });

  it("should detect manual override correctly", () => {
    const headerElement = document.createElement("div");

    shadowRoot = createMockShadowRoot({
      header: [headerElement],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);

    // No attribute - no manual override
    expect(manager.hasManualOverride()).to.be.false;

    // Add attribute - should detect manual override
    headerElement.setAttribute("collapsible", "");
    expect(manager.hasManualOverride()).to.be.true;
  });

  it("should disconnect observers when disconnect is called", () => {
    shadowRoot = createMockShadowRoot({
      toolbar: [createMockElement(50)],
      notification: [createMockElement(40)],
      header: [createMockElement(100)],
      footer: [createMockElement(80)],
    });

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.connect((state) => {
      stateChanges.push(state);
    });

    const initialCount = stateChanges.length;

    manager.disconnect();

    // After disconnect, no more state changes should occur
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(stateChanges.length).to.equal(initialCount);
        resolve();
      }, 100);
    });
  });

  it("should handle missing slots gracefully", () => {
    shadowRoot = createMockShadowRoot({});

    manager = new HeaderCollapsibleManager(shadowRoot, hostElement);
    manager.connect((state) => {
      stateChanges.push(state);
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(stateChanges.length).to.be.greaterThan(0);
        const lastState = stateChanges[stateChanges.length - 1];

        // Should handle gracefully with all heights as 0
        expect(lastState.availableBodyHeight).to.equal(600);
        expect(lastState.headerHeight).to.equal(0);
        resolve();
      }, 100);
    });
  });
});

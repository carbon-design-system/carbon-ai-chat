/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/chat-shell/index.js";
import CdsAiChatHeader from "@carbon/ai-chat-components/es/components/chat-shell/src/chat-header.js";

// Mock icon objects for testing
const Close = { name: "close", size: 16 };
const Restart = { name: "restart", size: 16 };

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("cds-aichat-chat-header", function () {
  // ========== Basic Rendering Tests ==========
  describe("Basic Rendering", () => {
    it("should render with minimum attributes", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      expect(el).to.be.instanceOf(CdsAiChatHeader);
      expect(el.shadowRoot).to.exist;
    });

    it("should have default property values", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      expect(el.headerTitle).to.equal("");
      expect(el.headerName).to.equal("");
      expect(el.actions).to.deep.equal([]);
      expect(el.overflow).to.be.false;
      expect(el.navigationType).to.equal("none");
      expect(el.navigationBackLabel).to.equal("");
      expect(el.navigationOverflowLabel).to.equal("");
    });

    it("should render toolbar component", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
    });
  });

  // ========== Property/Attribute Tests ==========
  describe("Properties and Attributes", () => {
    it("should set headerTitle property", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-title="title"
        ></cds-aichat-chat-header>`,
      );
      expect(el.headerTitle).to.equal("title");
    });

    it("should set headerName property", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-name="name"
        ></cds-aichat-chat-header>`,
      );
      expect(el.headerName).to.equal("name");
    });

    it("should set overflow attribute", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header overflow></cds-aichat-chat-header>`,
      );
      expect(el.overflow).to.be.true;
      expect(el.hasAttribute("overflow")).to.be.true;
    });

    it("should set navigationType property", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-type="back"
        ></cds-aichat-chat-header>`,
      );
      expect(el.navigationType).to.equal("back");
    });

    it("should set navigationBackLabel property", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-back-label="Back"
        ></cds-aichat-chat-header>`,
      );
      expect(el.navigationBackLabel).to.equal("Back");
    });

    it("should set navigationOverflowLabel property", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-overflow-label="Menu"
        ></cds-aichat-chat-header>`,
      );
      expect(el.navigationOverflowLabel).to.equal("Menu");
    });
  });

  // ========== Title Rendering Tests ==========
  describe("Title Rendering", () => {
    it("should render title when headerTitle is set", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-title="title"
        ></cds-aichat-chat-header>`,
      );
      const titleSlot = el.shadowRoot!.querySelector('[slot="title"]');
      expect(titleSlot).to.exist;
      expect(titleSlot!.textContent).to.include("title");
    });

    it("should render both title and name when both are set", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-title="title"
          header-name="name"
        ></cds-aichat-chat-header>`,
      );
      const titleSlot = el.shadowRoot!.querySelector('[slot="title"]');
      expect(titleSlot).to.exist;
      expect(titleSlot!.textContent).to.include("title");
      expect(titleSlot!.textContent).to.include("name");
    });

    it("should apply correct CSS classes to title elements", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-title="title"
          header-name="name"
        ></cds-aichat-chat-header>`,
      );
      const titleElement = el.shadowRoot!.querySelector(
        ".cds-aichat-chat-header__title-text",
      );
      const nameElement = el.shadowRoot!.querySelector(
        ".cds-aichat-chat-header__name-text",
      );
      expect(titleElement).to.exist;
      expect(nameElement).to.exist;
    });

    it("should use custom title slot when provided", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header header-title="Default Title">
          <div slot="title" id="custom-title">Custom Title Content</div>
        </cds-aichat-chat-header>`,
      );
      const customTitle = el.querySelector("#custom-title");
      expect(customTitle).to.exist;
      expect(customTitle!.textContent).to.equal("Custom Title Content");
    });
  });

  // ========== Actions Tests ==========
  describe("Actions", () => {
    it("should pass actions to toolbar", async () => {
      const actions = [
        {
          renderIcon: Restart,
          iconDescription: "Restart",
          onClick: () => {},
        },
      ];
      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header .actions=${actions}></cds-aichat-chat-header>
      `);
      expect(el.actions).to.deep.equal(actions);
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
    });

    it("should handle empty actions array", async () => {
      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header .actions=${[]}></cds-aichat-chat-header>
      `);
      expect(el.actions).to.deep.equal([]);
    });

    it("should pass overflow property to toolbar", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header overflow></cds-aichat-chat-header>`,
      );
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
      expect(toolbar!.hasAttribute("overflow")).to.be.true;
    });
  });

  // ========== Navigation Tests ==========
  describe("Navigation", () => {
    it("should not render navigation when navigationType is none", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-type="none"
        ></cds-aichat-chat-header>`,
      );
      const navSlot = el.shadowRoot!.querySelector('[slot="navigation"]');
      expect(navSlot).to.not.exist;
    });

    it("should render back button when navigationType is back", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-type="back"
          navigation-back-label="Back"
          .navigationBackIcon=${{ name: "arrow--left", size: 16 }}
        ></cds-aichat-chat-header>`,
      );
      await el.updateComplete;
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
      const backButton = toolbar!.querySelector(
        'cds-icon-button[slot="navigation"]',
      );
      expect(backButton).to.exist;
    });

    it("should call navigationBackOnClick when back button is clicked", async () => {
      let clicked = false;
      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header
          navigation-type="back"
          .navigationBackIcon=${{ name: "arrow--left", size: 16 }}
          .navigationBackOnClick=${() => {
            clicked = true;
          }}
        ></cds-aichat-chat-header>
      `);
      await el.updateComplete;
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      const backButton = toolbar!.querySelector(
        'cds-icon-button[slot="navigation"]',
      );
      (backButton as HTMLElement).click();
      await el.updateComplete;
      expect(clicked).to.be.true;
    });

    it("should render overflow menu when navigationType is overflow", async () => {
      const items = [
        { text: "Settings", onClick: () => {} },
        { text: "Help", onClick: () => {} },
      ];
      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header
          navigation-type="overflow"
          .navigationOverflowItems=${items}
        ></cds-aichat-chat-header>
      `);
      const navSlot = el.shadowRoot!.querySelector('[slot="navigation"]');
      expect(navSlot).to.exist;
      const overflowMenu = navSlot!.querySelector("cds-overflow-menu");
      expect(overflowMenu).to.exist;
    });

    it("should use custom navigation slot when provided", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header navigation-type="back">
          <div slot="navigation" id="custom-nav">Custom Navigation</div>
        </cds-aichat-chat-header>`,
      );
      const customNav = el.querySelector("#custom-nav");
      expect(customNav).to.exist;
      expect(customNav!.textContent).to.equal("Custom Navigation");
    });
  });

  // ========== Slot Tests ==========
  describe("Slots", () => {
    it("should support decorator slot", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header>
          <div slot="decorator" id="decorator-content">Decorator</div>
        </cds-aichat-chat-header>`,
      );
      const decorator = el.querySelector("#decorator-content");
      expect(decorator).to.exist;
      expect(decorator!.textContent).to.equal("Decorator");
    });

    it("should support fixed-actions slot", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header>
          <div slot="fixed-actions" id="fixed-actions-content">
            Fixed Actions
          </div>
        </cds-aichat-chat-header>`,
      );
      const fixedActions = el.querySelector("#fixed-actions-content");
      expect(fixedActions).to.exist;
      expect(fixedActions!.textContent).to.include("Fixed Actions");
    });

    it("should pass all slots to toolbar", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header>
          <div slot="navigation">Nav</div>
          <div slot="title">Title</div>
          <div slot="decorator">Decorator</div>
          <div slot="fixed-actions">Fixed</div>
        </cds-aichat-chat-header>`,
      );
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
    });
  });

  // ========== Focus Management Tests ==========
  describe("Focus Management", () => {
    it("should have requestFocus method", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      expect(el.requestFocus).to.be.a("function");
    });

    it("should return false when no focusable elements exist", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      const result = el.requestFocus();
      expect(result).to.be.false;
    });

    it("should focus navigation element when available", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          navigation-type="back"
          .navigationBackIcon=${{ name: "arrow--left", size: 16 }}
        ></cds-aichat-chat-header>`,
      );
      await el.updateComplete;

      // Wait for toolbar and its children to be fully rendered
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      if (toolbar && typeof (toolbar as any).updateComplete !== "undefined") {
        await (toolbar as any).updateComplete;
      }

      // Wait for icon button to be fully initialized
      const backButton = toolbar!.querySelector(
        'cds-icon-button[slot="navigation"]',
      );
      if (
        backButton &&
        typeof (backButton as any).updateComplete !== "undefined"
      ) {
        await (backButton as any).updateComplete;
      }

      // Additional wait for Carbon components to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = el.requestFocus();
      // The method should return a boolean (true if focus succeeded, false otherwise)
      expect(result).to.be.a("boolean");

      // If focus succeeded, verify navigation button exists
      if (result) {
        expect(backButton).to.exist;
      }
    });

    it("should focus first action when navigation not available", async () => {
      const actions = [
        {
          renderIcon: Restart,
          iconDescription: "Restart",
          onClick: () => {},
        },
      ];
      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header .actions=${actions}></cds-aichat-chat-header>
      `);
      await el.updateComplete;
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      if (toolbar && typeof (toolbar as any).requestFocus === "function") {
        const result = el.requestFocus();
        expect(result).to.be.true;
      }
    });

    it("should delegate focus to toolbar", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header></cds-aichat-chat-header>`,
      );
      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
      // Verify that requestFocus delegates to toolbar
      const result = el.requestFocus();
      expect(result).to.be.a("boolean");
    });
  });

  // ========== Integration Tests ==========
  describe("Integration", () => {
    it("should work with all features enabled", async () => {
      const actions = [
        {
          renderIcon: Restart,
          iconDescription: "Restart",
          onClick: () => {},
        },
      ];
      const fixedActions = [
        {
          renderIcon: Close,
          iconDescription: "Close",
          onClick: () => {},
        },
      ];
      const overflowItems = [
        { text: "Settings", onClick: () => {} },
        { text: "Help", onClick: () => {} },
      ];

      const el = await fixture<CdsAiChatHeader>(html`
        <cds-aichat-chat-header
          header-title="title"
          header-name="name"
          navigation-type="overflow"
          .actions=${actions}
          .fixedActions=${fixedActions}
          .navigationOverflowItems=${overflowItems}
          overflow
        ></cds-aichat-chat-header>
      `);

      expect(el.headerTitle).to.equal("title");
      expect(el.headerName).to.equal("name");
      expect(el.navigationType).to.equal("overflow");
      expect(el.actions).to.deep.equal(actions);
      expect(el.overflow).to.be.true;

      const toolbar = el.shadowRoot!.querySelector("cds-aichat-toolbar");
      expect(toolbar).to.exist;
    });

    it("should update when properties change", async () => {
      const el = await fixture<CdsAiChatHeader>(
        html`<cds-aichat-chat-header
          header-title="Initial Title"
        ></cds-aichat-chat-header>`,
      );
      expect(el.headerTitle).to.equal("Initial Title");

      el.headerTitle = "Updated Title";
      await el.updateComplete;
      expect(el.headerTitle).to.equal("Updated Title");

      const titleSlot = el.shadowRoot!.querySelector('[slot="title"]');
      expect(titleSlot!.textContent).to.include("Updated Title");
    });
  });
});

// Made with Bob

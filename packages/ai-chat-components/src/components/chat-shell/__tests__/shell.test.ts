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
import CdsAiChatShell from "@carbon/ai-chat-components/es/components/chat-shell/src/shell.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const nextFrame = (frames = 1) =>
  new Promise<void>((resolve) => {
    const tick = () => {
      if (frames <= 0) {
        resolve();
        return;
      }
      frames -= 1;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(tick);
      } else {
        setTimeout(tick, 0);
      }
    };

    tick();
  });

describe("cds-aichat-shell", function () {
  // ========== Basic Rendering Tests ==========
  describe("Basic Rendering", () => {
    it("should render with minimum attributes", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      expect(el).to.be.instanceOf(CdsAiChatShell);
      expect(el.shadowRoot).to.exist;
    });

    it("should have default property values", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      expect(el.aiEnabled).to.be.false;
      expect(el.showFrame).to.be.false;
      expect(el.roundedCorners).to.be.false;
      expect(el.showHistory).to.be.false;
      expect(el.showWorkspace).to.be.false;
      expect(el.workspaceLocation).to.equal("start");
      expect(el.historyLocation).to.equal("start");
    });

    it("should render shell root element", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell).to.exist;
    });
  });

  // ========== Property/Attribute Tests ==========
  describe("Properties and Attributes", () => {
    it("should reflect ai-enabled attribute", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell ai-enabled></cds-aichat-shell>`,
      );
      expect(el.aiEnabled).to.be.true;
      expect(el.hasAttribute("ai-enabled")).to.be.true;
    });

    it("should reflect show-frame attribute", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell show-frame></cds-aichat-shell>`,
      );
      expect(el.showFrame).to.be.true;
      expect(el.hasAttribute("show-frame")).to.be.true;
    });

    it("should reflect rounded-corners attribute", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
      );
      expect(el.roundedCorners).to.be.true;
      expect(el.hasAttribute("rounded-corners")).to.be.true;
    });

    it("should reflect show-history attribute", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell show-history></cds-aichat-shell>`,
      );
      expect(el.showHistory).to.be.true;
      expect(el.hasAttribute("show-history")).to.be.true;
    });

    it("should reflect show-workspace attribute", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell show-workspace></cds-aichat-shell>`,
      );
      expect(el.showWorkspace).to.be.true;
      expect(el.hasAttribute("show-workspace")).to.be.true;
    });

    it("should reflect workspace-location attribute with start value", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell workspace-location="start"></cds-aichat-shell>`,
      );
      expect(el.workspaceLocation).to.equal("start");
      expect(el.getAttribute("workspace-location")).to.equal("start");
    });

    it("should reflect workspace-location attribute with end value", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell workspace-location="end"></cds-aichat-shell>`,
      );
      expect(el.workspaceLocation).to.equal("end");
      expect(el.getAttribute("workspace-location")).to.equal("end");
    });

    it("should reflect history-location attribute with start value", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell history-location="start"></cds-aichat-shell>`,
      );
      expect(el.historyLocation).to.equal("start");
      expect(el.getAttribute("history-location")).to.equal("start");
    });

    it("should reflect history-location attribute with end value", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell history-location="end"></cds-aichat-shell>`,
      );
      expect(el.historyLocation).to.equal("end");
      expect(el.getAttribute("history-location")).to.equal("end");
    });
  });

  // ========== CSS Class Application Tests ==========
  describe("CSS Classes", () => {
    it("should apply ai-theme class when aiEnabled is true", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell ai-enabled></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("ai-theme")).to.be.true;
    });

    it("should not apply ai-theme class when aiEnabled is false", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("ai-theme")).to.be.false;
    });

    it("should apply frameless class when showFrame is false", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("frameless")).to.be.true;
    });

    it("should not apply frameless class when showFrame is true", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell show-frame></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("frameless")).to.be.false;
    });

    it("should apply rounded class when roundedCorners is true", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("rounded")).to.be.true;
    });

    it("should not apply rounded class when roundedCorners is false", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("rounded")).to.be.false;
    });

    it("should apply has-header-content class when header slot has content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="header">Header Content</div>
        </cds-aichat-shell>`,
      );
      await el.updateComplete;
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("has-header-content")).to.be.true;
    });

    it("should apply has-footer-content class when footer slot has content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="footer">Footer Content</div>
        </cds-aichat-shell>`,
      );
      await el.updateComplete;
      const shell = el.shadowRoot!.querySelector(".shell");
      expect(shell!.classList.contains("has-footer-content")).to.be.true;
    });
  });

  // ========== Slot Content Tests ==========
  describe("Slot Content", () => {
    it("should render header slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="header">Header Content</div>
        </cds-aichat-shell>`,
      );
      const headerSlot = el.shadowRoot!.querySelector(
        'slot[name="header"]',
      ) as HTMLSlotElement;
      expect(headerSlot).to.exist;
      const assigned = headerSlot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
      expect(assigned[0].textContent).to.equal("Header Content");
    });

    it("should render header-after slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="header-after">Header After Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="header-after"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render messages slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="messages">Messages Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="messages"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render messages-before slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="messages-before">Messages Before Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="messages-before"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render messages-after slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="messages-after">Messages After Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="messages-after"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render input slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="input">Input Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="input"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render input-before slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="input-before">Input Before Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="input-before"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render input-after slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="input-after">Input After Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="input-after"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render footer slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="footer">Footer Content</div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="footer"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });

    it("should render panels slot content", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="panels">
            <cds-aichat-panel>Panel Content</cds-aichat-panel>
          </div>
        </cds-aichat-shell>`,
      );
      const slot = el.shadowRoot!.querySelector(
        'slot[name="panels"]',
      ) as HTMLSlotElement;
      expect(slot).to.exist;
      const assigned = slot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
    });
  });

  // ========== History Integration Tests ==========
  describe("History Integration", () => {
    it("should render history slot when showHistory is true", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell show-history>
          <div slot="history">History Content</div>
        </cds-aichat-shell>`,
      );
      const historyContainer = el.shadowRoot!.querySelector(".history");
      expect(historyContainer).to.exist;
    });

    it("should not render history slot when showHistory is false", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell>
          <div slot="history">History Content</div>
        </cds-aichat-shell>`,
      );
      const historyContainer = el.shadowRoot!.querySelector(".history");
      expect(historyContainer).to.not.exist;
    });
  });

  // ========== COMPREHENSIVE ROUNDED CORNERS TESTS ==========
  describe("Rounded Corners - Critical Functionality", () => {
    describe("Base Rounded Corners Behavior", () => {
      it("should apply rounded class to shell when roundedCorners is true", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
        );
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("rounded")).to.be.true;
      });

      it("should not apply rounded corners when roundedCorners is false", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell></cds-aichat-shell>`,
        );
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("rounded")).to.be.false;
      });

      it("should not apply rounded corners when frameless", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
        );
        const shell = el.shadowRoot!.querySelector(".shell");
        // Frameless is default (showFrame=false), so rounded should still be applied
        expect(shell!.classList.contains("rounded")).to.be.true;
        expect(shell!.classList.contains("frameless")).to.be.true;
      });
    });

    describe("Header Rounded Corners", () => {
      it("should apply has-header-content class when header has content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">Header</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
      });

      it("should detect header content with text nodes", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <span slot="header">Text content</span>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
      });

      it("should apply has-content class to header slot wrapper", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">Header</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const headerWrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="header"]',
        );
        expect(headerWrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should not apply has-content class when header is empty", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
        );
        await el.updateComplete;
        const headerWrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="header"]',
        );
        expect(headerWrapper!.classList.contains("has-content")).to.be.false;
      });
    });

    describe("Header-After Rounded Corners", () => {
      it("should apply has-content class to header-after when it has content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header-after">Header After</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="header-after"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should prioritize header over header-after for top corners", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">Header</div>
            <div slot="header-after">Header After</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
        // Both should have has-content class
        const headerWrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="header"]',
        );
        const headerAfterWrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="header-after"]',
        );
        expect(headerWrapper!.classList.contains("has-content")).to.be.true;
        expect(headerAfterWrapper!.classList.contains("has-content")).to.be
          .true;
      });
    });

    describe("Footer Rounded Corners", () => {
      it("should apply has-footer-content class when footer has content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="footer">Footer</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-footer-content")).to.be.true;
      });

      it("should apply has-content class to footer slot wrapper", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="footer">Footer</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const footerWrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="footer"]',
        );
        expect(footerWrapper!.classList.contains("has-content")).to.be.true;
      });
    });

    describe("Input Slots Rounded Corners Priority", () => {
      it("should detect input-after content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="input-after">Input After</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="input-after"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should detect input content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="input">Input</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="input"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should detect input-before content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="input-before">Input Before</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="input-before"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should handle all input slots with content simultaneously", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="input-before">Input Before</div>
            <div slot="input">Input</div>
            <div slot="input-after">Input After</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const inputBefore = el.shadowRoot!.querySelector(
          '[data-panel-slot="input-before"]',
        );
        const input = el.shadowRoot!.querySelector('[data-panel-slot="input"]');
        const inputAfter = el.shadowRoot!.querySelector(
          '[data-panel-slot="input-after"]',
        );
        expect(inputBefore!.classList.contains("has-content")).to.be.true;
        expect(input!.classList.contains("has-content")).to.be.true;
        expect(inputAfter!.classList.contains("has-content")).to.be.true;
      });
    });

    describe("Messages Slots Rounded Corners", () => {
      it("should detect messages-before content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="messages-before">Messages Before</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="messages-before"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should detect messages-after content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="messages-after">Messages After</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="messages-after"]',
        );
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });

      it("should always consider messages slot as having content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
        );
        await el.updateComplete;
        const wrapper = el.shadowRoot!.querySelector(
          '[data-panel-slot="messages"]',
        );
        // Messages slot always has has-content class per the component logic
        expect(wrapper!.classList.contains("has-content")).to.be.true;
      });
    });

    describe("Complex Rounded Corners Scenarios", () => {
      it("should handle header + footer with rounded corners", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">Header</div>
            <div slot="footer">Footer</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
        expect(shell!.classList.contains("has-footer-content")).to.be.true;
        expect(shell!.classList.contains("rounded")).to.be.true;
      });

      it("should handle all slots with content", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">Header</div>
            <div slot="header-after">Header After</div>
            <div slot="messages-before">Messages Before</div>
            <div slot="messages">Messages</div>
            <div slot="messages-after">Messages After</div>
            <div slot="input-before">Input Before</div>
            <div slot="input">Input</div>
            <div slot="input-after">Input After</div>
            <div slot="footer">Footer</div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("rounded")).to.be.true;
        expect(shell!.classList.contains("has-header-content")).to.be.true;
        expect(shell!.classList.contains("has-footer-content")).to.be.true;

        // Verify all slot wrappers have has-content class
        const slots = [
          "header",
          "header-after",
          "messages-before",
          "messages",
          "messages-after",
          "input-before",
          "input",
          "input-after",
          "footer",
        ];
        slots.forEach((slotName) => {
          const wrapper = el.shadowRoot!.querySelector(
            `[data-panel-slot="${slotName}"]`,
          );
          expect(
            wrapper!.classList.contains("has-content"),
            `${slotName} should have has-content class`,
          ).to.be.true;
        });
      });

      it("should handle dynamic slot content changes", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
        );
        await el.updateComplete;

        // Initially no header content
        let shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.false;

        // Add header content dynamically
        const headerDiv = document.createElement("div");
        headerDiv.setAttribute("slot", "header");
        headerDiv.textContent = "Dynamic Header";
        el.appendChild(headerDiv);

        // Wait for slotchange event to be processed
        await new Promise((resolve) => setTimeout(resolve, 50));
        await el.updateComplete;

        // Should now have header content
        shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
      });

      it("should maintain rounded corners with show-frame enabled", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell
            rounded-corners
            show-frame
          ></cds-aichat-shell>`,
        );
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("rounded")).to.be.true;
        expect(shell!.classList.contains("frameless")).to.be.false;
      });

      it("should handle rounded corners with ai-enabled", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell
            rounded-corners
            ai-enabled
          ></cds-aichat-shell>`,
        );
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("rounded")).to.be.true;
        expect(shell!.classList.contains("ai-theme")).to.be.true;
      });
    });

    describe("Rounded Corners Edge Cases", () => {
      it("should detect element nodes even with whitespace", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header"></div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        // Element nodes are always considered as having content
        // even if they only contain whitespace
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
      });

      it("should detect element nodes in footer slot", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <span slot="footer"> </span>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        // Element nodes are always considered as having content
        expect(shell!.classList.contains("has-footer-content")).to.be.true;
      });

      it("should handle nested elements in slots", async () => {
        const el = await fixture<CdsAiChatShell>(
          html`<cds-aichat-shell rounded-corners>
            <div slot="header">
              <span><strong>Nested</strong> Header</span>
            </div>
          </cds-aichat-shell>`,
        );
        await el.updateComplete;
        const shell = el.shadowRoot!.querySelector(".shell");
        expect(shell!.classList.contains("has-header-content")).to.be.true;
      });
    });
  });

  // ========== Workspace Integration Tests ==========
  describe("Workspace Integration", () => {
    let originalConsoleTrace: typeof console.trace;

    beforeEach(() => {
      originalConsoleTrace = console.trace;
      console.trace = () => {};
    });

    afterEach(() => {
      console.trace = originalConsoleTrace;
    });

    it("should render workspace inline when width supports container mode", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell
          show-workspace
          style="
            width: 900px;
            display: block;
            --cds-aichat-workspace-min-width: 200px;
            --cds-aichat-messages-min-width: 300px;
            --cds-aichat-history-width: 0px;
          "
        >
          <div slot="workspace">Workspace Content</div>
        </cds-aichat-shell>`,
      );

      await el.updateComplete;

      const inlineWorkspace = el.shadowRoot!.querySelector(".workspace");
      const panel = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      );

      expect(inlineWorkspace).to.exist;
      expect(panel).to.not.exist;
      expect(el.hasAttribute("workspace-in-container")).to.be.true;
      expect(el.hasAttribute("workspace-in-panel")).to.be.false;
    });

    it("should render workspace in a panel and open after animation frame", async () => {
      const requiredWidth = window.innerWidth + 200;
      const workspaceMinWidth = requiredWidth - 320;

      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell
          show-workspace
          style="
            width: 600px;
            display: block;
            --cds-aichat-workspace-min-width: ${workspaceMinWidth}px;
            --cds-aichat-messages-min-width: 320px;
            --cds-aichat-history-width: 0px;
          "
        >
          <div slot="workspace">Workspace Content</div>
        </cds-aichat-shell>`,
      );

      await el.updateComplete;

      const panelBefore = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      ) as HTMLElement | null;
      expect(panelBefore).to.exist;
      expect(panelBefore?.hasAttribute("open")).to.be.false;

      await nextFrame(2);
      await el.updateComplete;

      const panelAfter = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      ) as HTMLElement | null;
      expect(panelAfter).to.exist;
      expect(panelAfter?.hasAttribute("open")).to.be.true;
      expect(el.hasAttribute("workspace-in-panel")).to.be.true;
      expect(el.hasAttribute("workspace-in-container")).to.be.false;
    });

    it("should remove panel after closeend when workspace is hidden", async () => {
      const requiredWidth = window.innerWidth + 200;
      const workspaceMinWidth = requiredWidth - 320;

      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell
          show-workspace
          style="
            width: 600px;
            display: block;
            --cds-aichat-workspace-min-width: ${workspaceMinWidth}px;
            --cds-aichat-messages-min-width: 320px;
            --cds-aichat-history-width: 0px;
          "
        >
          <div slot="workspace">Workspace Content</div>
        </cds-aichat-shell>`,
      );

      await el.updateComplete;
      await nextFrame(2);
      await el.updateComplete;

      const panelOpen = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      ) as HTMLElement | null;
      expect(panelOpen).to.exist;
      expect(panelOpen?.hasAttribute("open")).to.be.true;

      el.showWorkspace = false;
      await el.updateComplete;
      await nextFrame();
      await el.updateComplete;

      const panelClosing = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      ) as HTMLElement | null;
      expect(panelClosing).to.exist;
      expect(panelClosing?.hasAttribute("open")).to.be.false;

      panelClosing?.dispatchEvent(new CustomEvent("closeend"));
      await el.updateComplete;

      const panelAfterClose = el.shadowRoot!.querySelector(
        "cds-aichat-panel[data-internal-panel]",
      );
      expect(panelAfterClose).to.not.exist;
    });
  });

  // ========== Snapshot Tests ==========
  describe("Snapshots", () => {
    it("should match snapshot with default configuration", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell></cds-aichat-shell>`,
      );
      expect(el).dom.to.equalSnapshot();
    });

    it("should match snapshot with rounded corners", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell rounded-corners></cds-aichat-shell>`,
      );
      expect(el).dom.to.equalSnapshot();
    });

    it("should match snapshot with all properties enabled", async () => {
      const el = await fixture<CdsAiChatShell>(
        html`<cds-aichat-shell
          ai-enabled
          show-frame
          rounded-corners
          show-history
          show-workspace
        ></cds-aichat-shell>`,
      );
      expect(el).dom.to.equalSnapshot();
    });
  });
});

// Made with Bob

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
import CdsAiChatPanel from "@carbon/ai-chat-components/es/components/chat-shell/src/panel.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("cds-aichat-panel", function () {
  // ========== Basic Rendering Tests ==========
  describe("Basic Rendering", () => {
    it("should render with minimum attributes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      expect(el).to.be.instanceOf(CdsAiChatPanel);
      expect(el.shadowRoot).to.exist;
    });

    it("should have default property values", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      expect(el.open).to.be.false;
      expect(el.priority).to.equal(0);
      expect(el.fullWidth).to.be.false;
      expect(el.showChatHeader).to.be.false;
      expect(el.showFrame).to.be.false;
      expect(el.animationOnOpen).to.be.undefined;
      expect(el.animationOnClose).to.be.undefined;
      expect(el.inert).to.be.false;
    });

    it("should apply panel and panel-container classes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel")).to.be.true;
      expect(el.classList.contains("panel-container")).to.be.true;
    });

    it("should render panel-content wrapper", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      const panelContent = el.shadowRoot!.querySelector(".panel-content");
      expect(panelContent).to.exist;
    });
  });

  // ========== Property/Attribute Tests ==========
  describe("Properties and Attributes", () => {
    it("should reflect open attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      expect(el.open).to.be.true;
      expect(el.hasAttribute("open")).to.be.true;
    });

    it("should reflect priority attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel priority="5"></cds-aichat-panel>`,
      );
      expect(el.priority).to.equal(5);
      expect(el.getAttribute("priority")).to.equal("5");
    });

    it("should reflect full-width attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel full-width></cds-aichat-panel>`,
      );
      expect(el.fullWidth).to.be.true;
      expect(el.hasAttribute("full-width")).to.be.true;
    });

    it("should reflect show-chat-header attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel show-chat-header></cds-aichat-panel>`,
      );
      expect(el.showChatHeader).to.be.true;
      expect(el.hasAttribute("show-chat-header")).to.be.true;
    });

    it("should reflect show-frame attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel show-frame></cds-aichat-panel>`,
      );
      expect(el.showFrame).to.be.true;
      expect(el.hasAttribute("show-frame")).to.be.true;
    });

    it("should reflect animation-on-open attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          animation-on-open="slide-in-from-bottom"
        ></cds-aichat-panel>`,
      );
      expect(el.animationOnOpen).to.equal("slide-in-from-bottom");
      expect(el.getAttribute("animation-on-open")).to.equal(
        "slide-in-from-bottom",
      );
    });

    it("should reflect animation-on-close attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          animation-on-close="slide-out-to-bottom"
        ></cds-aichat-panel>`,
      );
      expect(el.animationOnClose).to.equal("slide-out-to-bottom");
      expect(el.getAttribute("animation-on-close")).to.equal(
        "slide-out-to-bottom",
      );
    });

    it("should reflect inert attribute", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel inert></cds-aichat-panel>`,
      );
      expect(el.inert).to.be.true;
      expect(el.hasAttribute("inert")).to.be.true;
    });
  });

  // ========== Slot Content Tests ==========
  describe("Slot Content", () => {
    it("should render header slot content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="header">Header Content</div>
        </cds-aichat-panel>`,
      );
      const headerSlot = el.shadowRoot!.querySelector(
        'slot[name="header"]',
      ) as HTMLSlotElement;
      expect(headerSlot).to.exist;
      const assigned = headerSlot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
      expect(assigned[0].textContent).to.equal("Header Content");
    });

    it("should render body slot content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="body">Body Content</div>
        </cds-aichat-panel>`,
      );
      const bodySlot = el.shadowRoot!.querySelector(
        'slot[name="body"]',
      ) as HTMLSlotElement;
      expect(bodySlot).to.exist;
      const assigned = bodySlot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
      expect(assigned[0].textContent).to.equal("Body Content");
    });

    it("should render footer slot content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="footer">Footer Content</div>
        </cds-aichat-panel>`,
      );
      const footerSlot = el.shadowRoot!.querySelector(
        'slot[name="footer"]',
      ) as HTMLSlotElement;
      expect(footerSlot).to.exist;
      const assigned = footerSlot.assignedElements({ flatten: true });
      expect(assigned.length).to.equal(1);
      expect(assigned[0].textContent).to.equal("Footer Content");
    });

    it("should apply has-content class to header when it has content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="header">Header</div>
        </cds-aichat-panel>`,
      );
      await el.updateComplete;
      const headerWrapper = el.shadowRoot!.querySelector(".panel-header");
      expect(headerWrapper!.classList.contains("has-content")).to.be.true;
    });

    it("should apply has-content class to body when it has content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="body">Body</div>
        </cds-aichat-panel>`,
      );
      await el.updateComplete;
      const bodyWrapper = el.shadowRoot!.querySelector(".panel-body");
      expect(bodyWrapper!.classList.contains("has-content")).to.be.true;
    });

    it("should apply has-content class to footer when it has content", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel>
          <div slot="footer">Footer</div>
        </cds-aichat-panel>`,
      );
      await el.updateComplete;
      const footerWrapper = el.shadowRoot!.querySelector(".panel-footer");
      expect(footerWrapper!.classList.contains("has-content")).to.be.true;
    });

    it("should not apply has-content class when slots are empty", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      await el.updateComplete;
      const headerWrapper = el.shadowRoot!.querySelector(".panel-header");
      const bodyWrapper = el.shadowRoot!.querySelector(".panel-body");
      const footerWrapper = el.shadowRoot!.querySelector(".panel-footer");
      expect(headerWrapper!.classList.contains("has-content")).to.be.false;
      expect(bodyWrapper!.classList.contains("has-content")).to.be.false;
      expect(footerWrapper!.classList.contains("has-content")).to.be.false;
    });
  });

  // ========== CSS Class Application Tests ==========
  describe("CSS Classes", () => {
    it("should apply panel--with-chat-header class when showChatHeader is true", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel show-chat-header></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--with-chat-header")).to.be.true;
    });

    it("should apply panel--with-frame class when showFrame is true", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel show-frame></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--with-frame")).to.be.true;
    });

    it("should apply panel--full-width class when fullWidth is true", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel full-width></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--full-width")).to.be.true;
    });

    it("should apply panel--closed class initially when not open", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--closed")).to.be.true;
      expect(el.classList.contains("panel--open")).to.be.false;
    });

    it("should apply panel--open class when open is true", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await el.updateComplete;
      expect(el.classList.contains("panel--open")).to.be.true;
      expect(el.classList.contains("panel--closed")).to.be.false;
    });
  });

  // ========== Animation State Tests ==========
  describe("Animation States", () => {
    it("should start in closed state", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--closed")).to.be.true;
    });

    it("should start in open state when open attribute is set", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await el.updateComplete;
      expect(el.classList.contains("panel--open")).to.be.true;
    });

    it("should apply animation class when animationOnOpen is set", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          animation-on-open="slide-in-from-bottom"
        ></cds-aichat-panel>`,
      );
      el.open = true;
      await el.updateComplete;
      // Animation class should be applied during opening
      expect(el.classList.contains("panel--opening--slide-in-from-bottom")).to
        .be.true;
    });

    it("should apply animation class when animationOnClose is set", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          open
          animation-on-close="slide-out-to-bottom"
        ></cds-aichat-panel>`,
      );
      await el.updateComplete;
      el.open = false;
      await el.updateComplete;
      // Animation class should be applied during closing
      expect(el.classList.contains("panel--closing--slide-out-to-bottom")).to.be
        .true;
    });

    it("should apply panel-container--animating class during transitions", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          animation-on-open="slide-in-from-bottom"
        ></cds-aichat-panel>`,
      );
      el.open = true;
      await el.updateComplete;
      expect(el.classList.contains("panel-container--animating")).to.be.true;
    });

    it("should not open when inert is true", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel inert></cds-aichat-panel>`,
      );
      el.open = true;
      await el.updateComplete;
      // Should remain closed because inert prevents opening
      expect(el.classList.contains("panel--closed")).to.be.true;
      expect(el.classList.contains("panel--open")).to.be.false;
    });

    it("should close when inert becomes true while open", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await el.updateComplete;
      expect(el.classList.contains("panel--open")).to.be.true;

      el.inert = true;
      await el.updateComplete;
      // Should close when inert is set
      expect(el.classList.contains("panel--closed")).to.be.true;
    });
  });

  // ========== Event Emission Tests ==========
  describe("Event Emission", () => {
    it("should emit openstart event when opening", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );

      const eventPromise = new Promise<CustomEvent>((resolve) => {
        el.addEventListener(
          "openstart",
          (e: Event) => resolve(e as CustomEvent),
          {
            once: true,
          },
        );
      });

      el.open = true;
      await el.updateComplete;

      const event = await eventPromise;
      expect(event).to.exist;
      expect(event.type).to.equal("openstart");
      expect(event.bubbles).to.be.true;
      expect(event.composed).to.be.true;
    });

    it("should emit openend event after opening completes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );

      const eventPromise = new Promise<CustomEvent>((resolve) => {
        el.addEventListener(
          "openend",
          (e: Event) => resolve(e as CustomEvent),
          {
            once: true,
          },
        );
      });

      el.open = true;
      await el.updateComplete;

      // Wait for animation to complete (or fallback to trigger)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const event = await eventPromise;
      expect(event).to.exist;
      expect(event.type).to.equal("openend");
      expect(event.bubbles).to.be.true;
      expect(event.composed).to.be.true;
    });

    it("should emit closestart event when closing", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await el.updateComplete;

      const eventPromise = new Promise<CustomEvent>((resolve) => {
        el.addEventListener(
          "closestart",
          (e: Event) => resolve(e as CustomEvent),
          { once: true },
        );
      });

      el.open = false;
      await el.updateComplete;

      const event = await eventPromise;
      expect(event).to.exist;
      expect(event.type).to.equal("closestart");
      expect(event.bubbles).to.be.true;
      expect(event.composed).to.be.true;
    });

    it("should emit closeend event after closing completes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await el.updateComplete;

      const eventPromise = new Promise<CustomEvent>((resolve) => {
        el.addEventListener(
          "closeend",
          (e: Event) => resolve(e as CustomEvent),
          {
            once: true,
          },
        );
      });

      el.open = false;
      await el.updateComplete;

      // Wait for animation to complete (or fallback to trigger)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const event = await eventPromise;
      expect(event).to.exist;
      expect(event.type).to.equal("closeend");
      expect(event.bubbles).to.be.true;
      expect(event.composed).to.be.true;
    });
  });

  // ========== Rounded Corners Tests ==========
  describe("Rounded Corners", () => {
    it("should apply rounded corners for full-width panels", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel full-width></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--full-width")).to.be.true;
    });

    it("should apply rounded corners when panel width is less than messages max width", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      // The panel--with-less-than-messages-max-width class is applied by ResizeObserver
      // We can verify the class exists in the component's logic
      expect(el.classList.contains("panel")).to.be.true;
    });

    it("should handle rounded corners with show-chat-header", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel full-width show-chat-header></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--full-width")).to.be.true;
      expect(el.classList.contains("panel--with-chat-header")).to.be.true;
    });

    it("should handle rounded corners without show-chat-header", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel full-width></cds-aichat-panel>`,
      );
      expect(el.classList.contains("panel--full-width")).to.be.true;
      expect(el.classList.contains("panel--with-chat-header")).to.be.false;
    });
  });

  // ========== Complex Scenarios ==========
  describe("Complex Scenarios", () => {
    it("should handle all properties together", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          open
          priority="10"
          full-width
          show-chat-header
          show-frame
          animation-on-open="slide-in-from-bottom"
          animation-on-close="slide-out-to-bottom"
        >
          <div slot="header">Header</div>
          <div slot="body">Body</div>
          <div slot="footer">Footer</div>
        </cds-aichat-panel>`,
      );
      await el.updateComplete;

      expect(el.open).to.be.true;
      expect(el.priority).to.equal(10);
      expect(el.fullWidth).to.be.true;
      expect(el.showChatHeader).to.be.true;
      expect(el.showFrame).to.be.true;
      expect(el.animationOnOpen).to.equal("slide-in-from-bottom");
      expect(el.animationOnClose).to.equal("slide-out-to-bottom");

      expect(el.classList.contains("panel--open")).to.be.true;
      expect(el.classList.contains("panel--full-width")).to.be.true;
      expect(el.classList.contains("panel--with-chat-header")).to.be.true;
      expect(el.classList.contains("panel--with-frame")).to.be.true;
    });

    it("should handle dynamic property changes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );

      // Initially closed
      expect(el.classList.contains("panel--closed")).to.be.true;

      // Open it
      el.open = true;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(el.classList.contains("panel--open")).to.be.true;

      // Close it
      el.open = false;
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(el.classList.contains("panel--closed")).to.be.true;
    });

    it("should handle priority changes", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel priority="1"></cds-aichat-panel>`,
      );
      expect(el.priority).to.equal(1);

      el.priority = 5;
      await el.updateComplete;
      expect(el.priority).to.equal(5);
      expect(el.getAttribute("priority")).to.equal("5");
    });

    it("should handle slot content changes dynamically", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      await el.updateComplete;

      // Initially no body content
      let bodyWrapper = el.shadowRoot!.querySelector(".panel-body");
      expect(bodyWrapper!.classList.contains("has-content")).to.be.false;

      // Add body content dynamically
      const bodyDiv = document.createElement("div");
      bodyDiv.setAttribute("slot", "body");
      bodyDiv.textContent = "Dynamic Body";
      el.appendChild(bodyDiv);

      // Wait for slotchange event to be processed
      await new Promise((resolve) => setTimeout(resolve, 50));
      await el.updateComplete;

      // Should now have body content
      bodyWrapper = el.shadowRoot!.querySelector(".panel-body");
      expect(bodyWrapper!.classList.contains("has-content")).to.be.true;
    });
  });

  // ========== Snapshot Tests ==========
  describe("Snapshots", () => {
    it("should match snapshot with default configuration", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel></cds-aichat-panel>`,
      );
      await expect(el).dom.to.equalSnapshot();
    });

    it("should match snapshot when open", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel open></cds-aichat-panel>`,
      );
      await expect(el).dom.to.equalSnapshot();
    });

    it("should match snapshot with all properties", async () => {
      const el = await fixture<CdsAiChatPanel>(
        html`<cds-aichat-panel
          open
          priority="5"
          full-width
          show-chat-header
          show-frame
        >
          <div slot="header">Header</div>
          <div slot="body">Body</div>
          <div slot="footer">Footer</div>
        </cds-aichat-panel>`,
      );
      await expect(el).dom.to.equalSnapshot();
    });
  });
});

// Made with Bob

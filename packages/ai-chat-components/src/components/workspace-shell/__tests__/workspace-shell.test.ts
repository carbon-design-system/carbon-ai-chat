// cspell:words CDSAIChatProcessing aichat
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/workspace-shell/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import CDSAIChatWorkspaceShell from "@carbon/ai-chat-components/es/components/workspace-shell/src/workspace-shell.js";
import CDSAIChatWorkspaceShellHeader from "@carbon/ai-chat-components/es/components/workspace-shell/src/workspace-shell-header.js";
import CDSAIChatWorkspaceShellBody from "@carbon/ai-chat-components/es/components/workspace-shell/src/workspace-shell-body.js";
import CDSAIChatWorkspaceShellFooter from "@carbon/ai-chat-components/es/components/workspace-shell/src/workspace-shell-footer.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const actions = [
  {
    text: "Launch",
    icon: iconLoader(Launch16, { slot: "icon" }),
    size: "md",
  },
  {
    text: "Maximize",
    icon: iconLoader(Maximize16, { slot: "icon" }),
    size: "md",
  },
  {
    text: "Close",
    fixed: true,
    icon: iconLoader(Close16, { slot: "icon" }),
    size: "md",
  },
];

describe("aichat workspace shell", function () {
  it("should render cds-aichat-workspace-shell in DOM", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell></cds-aichat-workspace-shell>`,
    );

    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
  });

  it("should render toolbar inside the toolbar slot", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell>
        <cds-aichat-toolbar
          slot="toolbar"
          ?overflow=${true}
          .actions=${actions}
        >
          <div slot="title" data-fixed>Toolbar</div>
          <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
            <div slot="body-text">
              <p class="secondary">
                Lorem ipsum dolor sit amet, di os consectetur adipiscing elit,
                sed do eiusmod tempor incididunt ut fsil labore et dolore magna
                aliqua.
              </p>
            </div>
          </cds-ai-label>
        </cds-aichat-toolbar>
      </cds-aichat-workspace-shell>`,
    );
    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
    // Query slotted content (light DOM)
    const toolbar = el.querySelector("cds-aichat-toolbar");
    expect(toolbar).to.exist;
    // Find the slot inside the shadowRoot
    const toolbarSlot = el.shadowRoot!.querySelector(
      'slot[name="toolbar"]',
    ) as HTMLSlotElement;
    expect(toolbarSlot).to.exist;
    // Get the slotted elements
    const assigned = toolbarSlot!.assignedElements({ flatten: true });
    // Check that the toolbar was slotted
    expect(assigned.length).to.equal(1);
    expect(assigned[0].tagName.toLowerCase()).to.equal("cds-aichat-toolbar");
  });
  it("should render notification inside the notification slot", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell>
        <cds-inline-notification
          slot="notification"
          .title="Title"
          .subtitle="Subtitle"
          kind="warning"
          low-contrast=""
          hide-close-button
        >
        </cds-inline-notification>
      </cds-aichat-workspace-shell>`,
    );
    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
    const notification = el.querySelector("cds-inline-notification");
    expect(notification).to.exist;
    const notificationSlot = el.shadowRoot!.querySelector(
      'slot[name="notification"]',
    ) as HTMLSlotElement;
    expect(notificationSlot).to.exist;
    const assigned = notificationSlot!.assignedElements({ flatten: true });
    expect(assigned.length).to.equal(1);
    expect(assigned[0].tagName.toLowerCase()).to.equal(
      "cds-inline-notification",
    );
  });
  it("should render cds-aichat-workspace-shell-header inside the header slot", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell>
        <cds-aichat-workspace-shell-header
          slot="header"
          title-text="Header Title"
          subtitle-text="Header Subtitle"
        >
          <p>Description inside header</p>
          <cds-button kind="tertiary" slot="header-action">
            Edit Plan
          </cds-button>
        </cds-aichat-workspace-shell-header>
      </cds-aichat-workspace-shell>`,
    );
    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
    const headerSlot = el.shadowRoot!.querySelector(
      'slot[name="header"]',
    ) as HTMLSlotElement;
    expect(headerSlot).to.exist;
    const assigned = headerSlot.assignedElements({ flatten: true });
    expect(assigned.length).to.equal(1);
    expect(assigned[0].tagName.toLowerCase()).to.equal(
      "cds-aichat-workspace-shell-header",
    );
  });
  it("should render cds-aichat-workspace-shell-body inside the body slot", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell>
        <cds-aichat-workspace-shell-body slot="body">
          <p>Some body content</p>
        </cds-aichat-workspace-shell-body>
      </cds-aichat-workspace-shell>`,
    );

    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
    const bodySlot = el.shadowRoot!.querySelector(
      'slot[name="body"]',
    ) as HTMLSlotElement;

    expect(bodySlot).to.exist;
    const assigned = bodySlot.assignedElements({ flatten: true });

    expect(assigned.length).to.equal(1);
    expect(assigned[0].tagName.toLowerCase()).to.equal(
      "cds-aichat-workspace-shell-body",
    );
  });
  it("should render cds-aichat-workspace-shell-footer inside the footer slot", async () => {
    const el = await fixture<CDSAIChatWorkspaceShell>(
      html`<cds-aichat-workspace-shell>
        <cds-aichat-workspace-shell-footer slot="footer">
          <cds-button
            size="2xl"
            data-index="1"
            kind="primary"
            slot="footer-action"
          >
            Button
          </cds-button>

          <cds-button
            size="2xl"
            data-index="2"
            kind="secondary"
            slot="footer-action"
          >
            Button
          </cds-button>

          <cds-button
            size="2xl"
            data-index="3"
            kind="ghost"
            slot="footer-action"
          >
            Button
          </cds-button>
        </cds-aichat-workspace-shell-footer>
      </cds-aichat-workspace-shell>`,
    );

    expect(el).to.be.instanceOf(CDSAIChatWorkspaceShell);
    const footerSlot = el.shadowRoot!.querySelector(
      'slot[name="footer"]',
    ) as HTMLSlotElement;
    expect(footerSlot).to.exist;
    const assigned = footerSlot.assignedElements({ flatten: true });
    expect(assigned.length).to.equal(1);
    expect(assigned[0].tagName.toLowerCase()).to.equal(
      "cds-aichat-workspace-shell-footer",
    );
  });
});
describe("CDSAIChatWorkspaceShellHeader - props and slot", () => {
  it("should set title-text and subtitle-text", async () => {
    const el = await fixture<CDSAIChatWorkspaceShellHeader>(html`
      <cds-aichat-workspace-shell-header
        title-text="My Title"
        subtitle-text="My Subtitle"
      ></cds-aichat-workspace-shell-header>
    `);
    expect(el.titleText).to.equal("My Title");
    expect(el.subTitleText).to.equal("My Subtitle");
    expect(el.getAttribute("title-text")).to.equal("My Title");
    expect(el.getAttribute("subtitle-text")).to.equal("My Subtitle");
  });
});
it("should correctly project header-action content into the slot", async () => {
  const el = await fixture<CDSAIChatWorkspaceShellHeader>(html`
    <cds-aichat-workspace-shell-header title-text="A" subtitle-text="B">
      <cds-button slot="header-action" kind="tertiary"> Edit </cds-button>
    </cds-aichat-workspace-shell-header>
  `);

  const slot = el.shadowRoot!.querySelector(
    'slot[name="header-action"]',
  ) as HTMLSlotElement;

  expect(slot).to.exist;

  const assigned = slot.assignedElements({ flatten: true });

  expect(assigned.length).to.equal(1);
  const btn = assigned[0] as HTMLElement;

  expect(btn.tagName.toLowerCase()).to.equal("cds-button");
  expect(btn.getAttribute("kind")).to.equal("tertiary");
  expect(btn.textContent?.trim()).to.equal("Edit");
});
describe("CDSAIChatWorkspaceShellBody - props", () => {
  it("should render body content", async () => {
    const el = await fixture<CDSAIChatWorkspaceShellBody>(html`
      <cds-aichat-workspace-shell-body>
        <p>Body content</p>
      </cds-aichat-workspace-shell-body>
    `);
    const slot = el.shadowRoot!.querySelector("slot")!;
    const assigned = slot.assignedNodes({ flatten: true });
    const elementNodes = assigned.filter(
      (node) => node.nodeType === Node.ELEMENT_NODE,
    ) as HTMLElement[];

    expect(elementNodes.length).to.equal(1);
    expect(elementNodes[0].tagName.toLowerCase()).to.equal("p");
    expect(elementNodes[0].textContent?.trim()).to.equal("Body content");
  });
});

describe("CDSAIChatWorkspaceShellFooter - props & actions", () => {
  it("should project footer-action buttons into the footer slot and expose their props", async () => {
    const el = await fixture<CDSAIChatWorkspaceShellFooter>(html`
      <cds-aichat-workspace-shell-footer>
        <cds-button slot="footer-action" kind="primary">Button A</cds-button>
        <cds-button slot="footer-action" kind="secondary">Button B</cds-button>
      </cds-aichat-workspace-shell-footer>
    `);
    const slot = el.shadowRoot!.querySelector(
      'slot[name="footer-action"]',
    ) as HTMLSlotElement;
    expect(slot).to.exist;
    const assigned = slot.assignedElements({ flatten: true });
    expect(assigned.length).to.equal(2);
    const btnA = assigned[0] as HTMLElement;
    const btnB = assigned[1] as HTMLElement;
    expect(btnA.getAttribute("kind")).to.equal("primary");
    expect(btnB.getAttribute("kind")).to.equal("secondary");
    expect(btnA.textContent?.trim()).to.equal("Button A");
    expect(btnB.textContent?.trim()).to.equal("Button B");
  });
});

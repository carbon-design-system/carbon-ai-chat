/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../src/shell";
import "../src/chat-header";
import "@carbon/web-components/es/components/ai-label/index.js";
import "@carbon/web-components/es/components/ai-label/ai-label-action-button.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/link/link.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/content-switcher/index.js";
import { html } from "lit";
import { ref, createRef } from "lit/directives/ref.js";
import Close from "@carbon/icons/es/close/16.js";
import Restart from "@carbon/icons/es/restart/16.js";
import Menu16 from "@carbon/icons/es/menu/16.js";
import ChevronLeft from "@carbon/icons/es/chevron--left/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import styles from "./story-styles.scss?lit";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

const explainabilityPopoverContent = html`
  <div
    role="dialog"
    slot="body-text"
    class="cds-aichat-explainability-popover--content"
  >
    <header class="cds-aichat-explainability-popover--content__header">
      <div class="cds-aichat-explainability-popover--content__eyebrow-row">
        <span class="cds-aichat-explainability-popover--content__label">
          AI explained
        </span>
        <cds-tag
          class="cds-aichat--header__slug-confidence"
          size="sm"
          type="outline"
        >
          Confidence: 89%
        </cds-tag>
      </div>
      <h2 class="cds-aichat-explainability-popover--content__title">
        Name of feature
      </h2>
      <p class="cds-aichat-explainability-popover--content__description">
        High level 1-2 sentence description of how the AI is being used in the
        UI.
      </p>
    </header>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>How it works</h3>
        <ol>
          <li>1. <strong>Key word.</strong> Description of key word.</li>
          <li>2. <strong>Key word.</strong> Description of key word.</li>
          <li>3. <strong>Key word.</strong> Description of key word.</li>
        </ol>
      </div>
      <div>
        <h3>Data types used</h3>
        <ul>
          <li>— <strong>Data type 1.</strong> Explain how it's used.</li>
          <li>— <strong>Data type 2.</strong> Explain how it's used.</li>
          <li>— <strong>Data type 3.</strong> Explain how it's used.</li>
        </ul>
      </div>
    </section>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>AI model</h3>
        <cds-link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span slot="icon">${iconLoader(Launch16)}</span>
          granite.13b.v2.instruct
        </cds-link>
      </div>
      <div>
        <h4>Additional details</h4>
        <p>
          Additional information about data used to fine tune and/or train the
          model
        </p>
      </div>
    </section>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>Training data set</h3>
        <cds-link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span slot="icon">${iconLoader(Launch16)}</span>
          IBM Security data piles
        </cds-link>
      </div>
    </section>
  </div>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(Folders16)}</span>
    <span slot="tooltip-content">Folders</span>
  </cds-icon-button>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(FolderOpen16)}</span>
    <span slot="tooltip-content">Open Folder</span>
  </cds-icon-button>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(View16)}</span>
    <span slot="tooltip-content">View</span>
  </cds-icon-button>
  <cds-ai-label-action-button slot="actions"
    >View details</cds-ai-label-action-button
  >
`;

const sampleActions = [
  {
    text: "Restart conversation",
    icon: Restart,
    onClick: () => console.log("Restart clicked"),
  },
  {
    text: "Close chat",
    icon: Close,
    onClick: () => console.log("Close clicked"),
    fixed: true,
  },
];

const sampleOverflowItems = [
  {
    text: "Settings",
    onClick: () => console.log("Settings clicked"),
  },
  {
    text: "Help",
    onClick: () => console.log("Help clicked"),
  },
  {
    text: "About",
    onClick: () => console.log("About clicked"),
  },
];

export default {
  title: "Preview/Chat shell/Header",
  args: {
    headerTitle: "title",
    headerName: "name",
  },
  argTypes: {
    headerTitle: {
      control: "text",
      description: "Main title text",
    },
    headerName: {
      control: "text",
      description: "Subtitle/name text",
    },
    fixedActions: {
      control: "select",
      options: ["content switcher", "custom button", "none"],
      mapping: {
        "content switcher": html` <div slot="fixed-actions">
          <cds-content-switcher
            @cds-content-switcher-selected=${(e) => console.log(e)}
            selection-mode="automatic"
            selected-index="0"
            size="sm"
          >
            <cds-content-switcher-item value="code" name="one">
              Code
            </cds-content-switcher-item>
            <cds-content-switcher-item value="preview" name="two">
              Preview
            </cds-content-switcher-item>
          </cds-content-switcher>
        </div>`,
        "custom button": html` <div slot="fixed-actions">
          <cds-button
            @click=${() => console.log("Custom button clicked")}
            size="md"
            >Custom</cds-button
          >
        </div>`,
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Fixed actions slot for chat header component. `slot='fixed-actions'`",
    },
    aiLabel: {
      table: { category: "slot" },
      control: "boolean",
      description:
        "AI Label slot in the chat header component `slot='decorator'`",
    },
  },
};

export const Default = {
  args: {
    showActions: true,
    fixedActions: "none",
    aiLabel: false,
  },
  argTypes: {
    showActions: {
      control: "boolean",
      description: "Show or hide action buttons",
    },
  },
  render: (args) => {
    const actions = args.showActions ? sampleActions : [];
    return html`
      <style>
        ${styles}
      </style>
      <cds-aichat-shell>
        <cds-aichat-chat-header
          slot="header"
          .headerTitle=${args.headerTitle}
          .headerName=${args.headerName}
          .actions=${actions}
        >
          ${args.fixedActions}
          ${args.aiLabel
            ? html` <cds-ai-label
                size="2xs"
                autoalign
                alignment="bottom"
                slot="decorator"
              >
                ${explainabilityPopoverContent}
              </cds-ai-label>`
            : ""}
        </cds-aichat-chat-header>
        <div slot="messages" class="messages slot-sample">Messages</div>
        <div slot="input" class="input slot-sample">Input</div>
      </cds-aichat-shell>
    `;
  },
};

export const WithOverflowNavigation = {
  args: {
    navigationOverflowLabel: "Menu",
    navigationOverflowAriaLabel: "Open menu",
    showActions: true,
    fixedActions: "none",
    aiLabel: false,
  },
  argTypes: {
    navigationOverflowLabel: {
      control: "text",
      description: "Label for overflow menu button",
    },
    navigationOverflowAriaLabel: {
      control: "text",
      description: "Aria label for overflow menu",
    },
    showActions: {
      control: "boolean",
      description: "Show or hide action buttons",
    },
  },
  render: (args) => {
    const actions = args.showActions ? sampleActions : [];
    return html`
      <style>
        ${styles}
      </style>
      <cds-aichat-shell>
        <cds-aichat-chat-header
          slot="header"
          .headerTitle=${args.headerTitle}
          .headerName=${args.headerName}
          .actions=${actions}
          navigation-type="overflow"
          .navigationOverflowIcon=${Menu16}
          navigation-overflow-label=${args.navigationOverflowLabel}
          navigation-overflow-aria-label=${args.navigationOverflowAriaLabel}
          .navigationOverflowItems=${sampleOverflowItems}
        >
          ${args.fixedActions}
          ${args.aiLabel
            ? html` <cds-ai-label
                size="2xs"
                autoalign
                alignment="bottom"
                slot="decorator"
              >
                ${explainabilityPopoverContent}
              </cds-ai-label>`
            : ""}
        </cds-aichat-chat-header>
        <div slot="messages" class="messages slot-sample">Messages</div>
        <div slot="input" class="input slot-sample">Input</div>
      </cds-aichat-shell>
    `;
  },
};

export const WithFocusManagement = {
  args: {
    headerTitle: "title",
    headerName: "name",
    navigationType: "back",
    navigationBackLabel: "Back",
    showActions: true,
    overflow: false,
    fixedActions: "none",
    aiLabel: false,
  },
  render: (args) => {
    const headerRef = createRef();
    const actions = args.showActions ? sampleActions : [];

    const handleRequestFocus = () => {
      if (headerRef.value) {
        const success = headerRef.value.requestFocus();
        console.log("Focus request:", success ? "successful" : "failed");
      }
    };

    return html`
      <style>
        ${styles}
      </style>
      <div>
        <cds-button @click=${handleRequestFocus} style="margin-bottom: 16px;">
          Request Focus on Header
        </cds-button>
        <cds-aichat-shell>
          <cds-aichat-chat-header
            ${ref(headerRef)}
            slot="header"
            .headerTitle=${args.headerTitle}
            .headerName=${args.headerName}
            .actions=${actions}
            ?overflow=${args.overflow}
            navigation-type=${args.navigationType}
            .navigationBackIcon=${ChevronLeft}
            navigation-back-label=${args.navigationBackLabel}
            @cds-aichat-chat-header-navigation-back-click=${() =>
              console.log("Back clicked")}
          >
            ${args.fixedActions}
            ${args.aiLabel
              ? html` <cds-ai-label
                  size="2xs"
                  autoalign
                  alignment="bottom"
                  slot="decorator"
                >
                  ${explainabilityPopoverContent}
                </cds-ai-label>`
              : ""}
          </cds-aichat-chat-header>
          <div slot="messages" class="messages slot-sample">Messages</div>
          <div slot="input" class="input slot-sample">Input</div>
        </cds-aichat-shell>
      </div>
    `;
  },
};

// Made with Bob

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../src/shell";
import "../src/chat-header";
import "@carbon/web-components/es/components/ai-label/index.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/content-switcher/index.js";
import { html } from "lit";
import Close from "@carbon/icons/es/close/16.js";
import Restart from "@carbon/icons/es/restart/16.js";
import OverflowMenuVertical from "@carbon/icons/es/overflow-menu--vertical/16.js";
import styles from "./story-styles.scss?lit";

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
  title: "Components/Chat shell/Header",
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
                <div slot="body-text">
                  <h4 class="margin-bottom-05">Powered by IBM watsonx</h4>
                  <div>
                    IBM watsonx is powered by the latest AI models to
                    intelligently process conversations and provide help
                    whenever and wherever you may need it.
                  </div>
                </div>
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
          .navigationOverflowIcon=${OverflowMenuVertical}
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
                <div slot="body-text">
                  <h4 class="margin-bottom-05">Powered by IBM watsonx</h4>
                  <div>
                    IBM watsonx is powered by the latest AI models to
                    intelligently process conversations and provide help
                    whenever and wherever you may need it.
                  </div>
                </div>
              </cds-ai-label>`
            : ""}
        </cds-aichat-chat-header>
        <div slot="messages" class="messages slot-sample">Messages</div>
        <div slot="input" class="input slot-sample">Input</div>
      </cds-aichat-shell>
    `;
  },
};

// Made with Bob

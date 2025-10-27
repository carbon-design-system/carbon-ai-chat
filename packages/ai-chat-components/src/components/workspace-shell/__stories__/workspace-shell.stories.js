/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { html } from "lit";
import styles from "./story-styles.scss?lit";
import Copy16 from "@carbon/icons/es/copy/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";

export default {
  title: "Components/Workspace shell",
  argTypes: {
    toolbarTitle: {
      control: "text",
      description: "Title text for the Toolbar Component",
    },
    notificationTitle: {
      control: "text",
      description: "Title text for the Notification Component",
    },
    notificationSubTitle: {
      control: "text",
      description: "SubTitle text for the Notification Component",
    },
    headerTitle: {
      control: "text",
      description: "Title text for the Header Component",
    },
    headerSubTitle: {
      control: "text",
      description: "SubTitle text for the Header Component",
    },
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <cds-aichat-workspace-shell>${story()}</cds-aichat-workspace-shell>
    `,
  ],
};

export const Default = {
  args: {
    toolbarTitle: "Title",
    notificationTitle: "Title",
    notificationSubTitle: "Message",
    headerTitle: "Title",
    headerSubTitle: "Sub title",
  },
  render: (args) => {
    return html`
      <cds-aichat-workspace-shell-toolbar title-text="${args.toolbarTitle}">
        <cds-ai-label autoalign="" slot="toolbar-action">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Copy16, { slot: "icon" })}
          <span slot="tooltip-content">Copy</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Download16, { slot: "icon" })}
          <span slot="tooltip-content">Download</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Share16, { slot: "icon" })}
          <span slot="tooltip-content">Share</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Launch16, { slot: "icon" })}
          <span slot="tooltip-content">Launch</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Maximize16, { slot: "icon" })}
          <span slot="tooltip-content">Maximize</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">Close</span>
        </cds-icon-button>
      </cds-aichat-workspace-shell-toolbar>
      <cds-aichat-workspace-shell-notification
        title-text="${args.notificationTitle}"
        subtitle="${args.notificationSubTitle}"
      >
      </cds-aichat-workspace-shell-notification>
      <cds-aichat-workspace-shell-header
        title-text="${args.headerTitle}"
        subtitle-text="${args.headerSubTitle}"
      >
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
        <div slot="header-description">
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
        </div>
        <cds-button kind="tertiary" slot="header-actions">
          Edit Plan ${iconLoader(Edit16, { slot: "icon" })}
        </cds-button>
      </cds-aichat-workspace-shell-header>
      <cds-aichat-workspace-shell-body>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco.
      </cds-aichat-workspace-shell-body>
      <cds-aichat-workspace-shell-footer>
        <cds-button
          size="2xl"
          data-index="1"
          kind="primary"
          slot="footer-actions"
          >Button</cds-button
        >
        <cds-button
          size="2xl"
          data-index="2"
          kind="secondary"
          slot="footer-actions"
          >Button</cds-button
        >
        <cds-button size="2xl" data-index="3" kind="ghost" slot="footer-actions"
          >Button</cds-button
        >
      </cds-aichat-workspace-shell-footer>
    `;
  },
};

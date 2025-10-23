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
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { html } from "lit";
import styles from "./story-styles.scss?lit";
import Copy16 from "@carbon/icons/es/copy/16.js";
import AiLabel16 from "@carbon/icons/es/ai-label/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";

export default {
  title: "Components/Workspace shell",
  argTypes: {
    useWrapper: {
      control: "boolean",
      description: "Toggle rendering inside <cds-aichat-workspace-shell>",
    },
    onClick: { action: "onClick" },
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
  args: { maxWidth: "sm", useWrapper: true },
  render: () => {
    return html`
      <cds-aichat-workspace-shell-toolbar title-text="Title">
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(AiLabel16, { slot: "icon" })}
          <span slot="tooltip-content">action 2</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Copy16, { slot: "icon" })}
          <span slot="tooltip-content">action 1</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Download16, { slot: "icon" })}
          <span slot="tooltip-content">action 3</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Share16, { slot: "icon" })}
          <span slot="tooltip-content">action 1</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Launch16, { slot: "icon" })}
          <span slot="tooltip-content">action 2</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Maximize16, { slot: "icon" })}
          <span slot="tooltip-content">action 3</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="toolbar-action"
        >
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">action 3</span>
        </cds-icon-button>
      </cds-aichat-workspace-shell-toolbar>
      <cds-aichat-workspace-shell-header
        title-text="Title"
        subtitle-text="Sub title"
      >
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco. View more
        </div>
        <cds-button kind="tertiary" slot="header-actions">
          Edit Plan ${iconLoader(Edit16, { slot: "icon" })}
        </cds-button>
      </cds-aichat-workspace-shell-header>
      <div slot="body">test</div>
      <cds-aichat-workspace-shell-footer
        button-one-text="Button"
        button-two-text="Button"
        button-three-text="Button"
      >
      </cds-aichat-workspace-shell-footer>
    `;
  },
};

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import "../../toolbar/index";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/notification/inline-notification.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { action } from "storybook/actions";
import { html } from "lit";
import Edit16 from "@carbon/icons/es/edit/16.js";
import { actionLists, FooterActionList } from "./story-data";
import { getHeaderDescription, getBodyContent } from "./story-hleper";

export default {
  title: "Components/Workspace shell",
  argTypes: {
    toolbarTitle: {
      control: "text",
      description: "Title text for the Toolbar Component",
    },
    toolbarAction: {
      control: {
        type: "select",
      },
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        "Select which predefined set of actions to render in the Toolbar component.",
    },
    toolbarOverflow: {
      control: "boolean",
      description:
        "Provides an option to overflow actions into an overflow menu when the cds-aichat-toolbar component is used in the toolbar slot.",
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
    headerDescription: {
      control: {
        type: "select",
      },
      options: {
        "Basic text": "basic",
        "With Tags": "withTags",
      },
      description: "Defines the type of description text in Header Component",
    },
    showHeaderAction: {
      control: "boolean",
      description: "Toggles whether header actions are shown",
    },
    bodyContent: {
      control: {
        type: "select",
      },
      options: {
        "Short text": "short",
        "Long text": "long",
      },
      description: "Defines the content in Body Component",
    },
    footerAction: {
      control: {
        type: "select",
      },
      options: Object.keys(FooterActionList),
      description: "Defines the actions slot in Footer component ",
    },
  },
  parameters: {
    controls: {
      sort: [
        "toolbarTitle",
        "toolbarAction",
        "toolbarOverflow",
        "notificationTitle",
        "notificationSubTitle",
        "headerTitle",
        "headerSubTitle",
        "headerDescription",
        "showHeaderAction",
        "bodyContent",
        "footerAction",
      ],
    },
  },
  decorators: [
    (story) =>
      html`<cds-aichat-workspace-shell
        >${story()}</cds-aichat-workspace-shell
      > `,
  ],
};

export const Default = {
  args: {
    toolbarTitle: "Title",
    toolbarAction: "Advanced list",
    toolbarOverflow: true,
    notificationTitle: "Title",
    notificationSubTitle: "Message",
    headerTitle: "Title",
    headerSubTitle: "Sub title",
    headerDescription: "withTags",
    showHeaderAction: true,
    bodyContent: "short",
    footerAction: "Three buttons with one ghost",
  },
  render: (args) => {
    return html`
      <cds-aichat-toolbar
        slot="toolbar"
        ?overflow=${args.toolbarOverflow}
        .actions=${args.toolbarAction}
      >
        <div
          slot="title"
          data-fixed
          class="story__toolbar-tile"
          title=${args.toolbarTitle}
        >
          ${args.toolbarTitle}
        </div>
        <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
      </cds-aichat-toolbar>
      <cds-inline-notification
        slot="notification"
        .title="${args.notificationTitle}"
        .subtitle="${args.notificationSubTitle}"
        kind="warning"
        low-contrast=""
        hide-close-button
      >
      </cds-inline-notification>
      <cds-aichat-workspace-shell-header
        title-text="${args.headerTitle}"
        subtitle-text="${args.headerSubTitle}"
      >
        ${getHeaderDescription(args.headerDescription)}
        ${args.showHeaderAction &&
        html`
          <cds-button kind="tertiary" slot="header-action">
            Edit Plan ${iconLoader(Edit16, { slot: "icon" })}
          </cds-button>
        `}
      </cds-aichat-workspace-shell-header>
      <cds-aichat-workspace-shell-body>
        ${getBodyContent(args.bodyContent)}
      </cds-aichat-workspace-shell-body>
      ${args.footerAction !== "None" &&
      html`
        <cds-aichat-workspace-shell-footer
          @cds-aichat-workspace-shell-footer-clicked=${(e) =>
            action("action")(e.detail)}
          .actions=${FooterActionList[args.footerAction]}
        >
        </cds-aichat-workspace-shell-footer>
      `}
    `;
  },
};

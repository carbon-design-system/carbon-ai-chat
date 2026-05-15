/*
 *  Copyright IBM Corp. 2026
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
import "@carbon/web-components/es/components/ai-label/ai-label-action-button.js";
import "@carbon/web-components/es/components/link/link.js";
import "@carbon/web-components/es/components/notification/inline-notification.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
import { action } from "storybook/actions";
import { html } from "lit";
import Edit16 from "@carbon/icons/es/edit/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import { actionLists, FooterActionList } from "./story-data";
import { getHeaderDescription, getBodyContent } from "./story-helper";
import styles from "./story-styles.scss?lit";

export default {
  title: "Components/Workspace shell",
  component: "cds-aichat-workspace-shell",
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
      options: ["basic", "withTags"],
      mapping: {
        basic: "basic",
        withTags: "withTags",
      },
      description: "Defines the type of description text in Header Component",
    },
    showHeaderAction: {
      control: "boolean",
      description: "Toggles whether header actions are shown",
    },
    autoCollapsibleHeader: {
      control: "boolean",
      description:
        "Enable automatic header collapsible behavior based on available space. Note: This prop is currently experimental and is subject to future changes.",
    },
    bodyContent: {
      control: {
        type: "select",
      },
      options: ["short", "long"],
      mapping: {
        short: "short",
        long: "long",
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
        "autoCollapsibleHeader",
        "bodyContent",
        "footerAction",
      ],
    },
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
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
    autoCollapsibleHeader: false,
    bodyContent: "short",
    footerAction: "Three buttons with one ghost",
  },
  render: (args) => {
    return html` <cds-aichat-workspace-shell
      ?auto-collapsible-header=${args.autoCollapsibleHeader}
    >
      <cds-aichat-toolbar
        slot="toolbar"
        ?overflow=${args.toolbarOverflow}
        .actions=${args.toolbarAction}
        titleText=${args.toolbarTitle}
      >
        <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
          <div
            role="dialog"
            slot="body-text"
            class="cds-aichat-explainability-popover--content"
          >
            <header class="cds-aichat-explainability-popover--content__header">
              <div
                class="cds-aichat-explainability-popover--content__eyebrow-row"
              >
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
              <p
                class="cds-aichat-explainability-popover--content__description"
              >
                High level 1-2 sentence description of how the AI is being used
                in the UI.
              </p>
            </header>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>How it works</h3>
                <ol>
                  <li>
                    1. <strong>Key word.</strong> Description of key word.
                  </li>
                  <li>
                    2. <strong>Key word.</strong> Description of key word.
                  </li>
                  <li>
                    3. <strong>Key word.</strong> Description of key word.
                  </li>
                </ol>
              </div>
              <div>
                <h3>Data types used</h3>
                <ul>
                  <li>
                    — <strong>Data type 1.</strong> Explain how it's used.
                  </li>
                  <li>
                    — <strong>Data type 2.</strong> Explain how it's used.
                  </li>
                  <li>
                    — <strong>Data type 3.</strong> Explain how it's used.
                  </li>
                </ul>
              </div>
            </section>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>AI model</h3>
                <cds-link
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${iconLoader(Launch16, { slot: "icon", size: 16 })}
                  granite.13b.v2.instruct
                </cds-link>
              </div>
              <div>
                <h4>Additional details</h4>
                <p>
                  Additional information about data used to fine tune and/or
                  train the model
                </p>
              </div>
            </section>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>Training data set</h3>
                <cds-link
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${iconLoader(Launch16, { slot: "icon", size: 16 })} IBM
                  Security data piles
                </cds-link>
              </div>
            </section>
          </div>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            ${iconLoader(Folders16, { slot: "icon" })}
            <span slot="tooltip-content">Folders</span>
          </cds-icon-button>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            ${iconLoader(FolderOpen16, { slot: "icon" })}
            <span slot="tooltip-content">Open Folder</span>
          </cds-icon-button>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            ${iconLoader(View16, { slot: "icon" })}
            <span slot="tooltip-content">View</span>
          </cds-icon-button>
          <cds-ai-label-action-button slot="actions"
            >View details</cds-ai-label-action-button
          >
        </cds-ai-label>
      </cds-aichat-toolbar>
      <cds-inline-notification
        slot="notification"
        .title="${args.notificationTitle}"
        .subtitle="${args.notificationSubTitle}"
        kind="warning"
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
    </cds-aichat-workspace-shell>`;
  },
};

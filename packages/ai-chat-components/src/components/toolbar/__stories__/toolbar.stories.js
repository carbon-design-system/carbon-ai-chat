/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/ai-label/ai-label-action-button.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/link/link.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/copy-button/copy-button.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";
import "@carbon/web-components/es/components/content-switcher/index.js";

import {
  Home16,
  ArrowLeft16,
  OverflowMenuVertical16,
  Launch16,
  Folders16,
  FolderOpen16,
  View16,
} from "@carbon/icons";

import { html } from "lit";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { actionLists } from "./story-data";
import { action } from "storybook/actions";

import styles from "./story-styles.scss?lit";
import "@carbon/ai-chat/css/chat-explainability-popover.css";

export default {
  title: "Components/Toolbar",
  component: "cds-aichat-toolbar",
  argTypes: {
    title: {
      control: "select",
      table: { category: "slot" },
      options: ["default", "with truncation", "none"],
      mapping: {
        default: html`<div slot="title">
          Title <span class="bold">text</span>
        </div>`,
        "with truncation": html`<div slot="title">
          <span class="truncated-text">
            Lorem ipsum dolor sit amet <span class="bold">consectetur</span>
          </span>
        </div>`,
        none: undefined,
      },
      description:
        "Title text for the Toolbar component. This Storybook-only control populates the title slot. `slot='title'`",
    },
    navigation: {
      control: "select",
      options: ["home", "back", "custom 1", "custom 2", "none"],
      mapping: {
        home: html` <div slot="navigation" data-rounded="top-left">
          <cds-icon-button
            kind="ghost"
            @click=${action("onClick")}
            align="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
          >
            ${iconLoader(Home16, { slot: "icon" })}
            <span slot="tooltip-content">Home</span>
          </cds-icon-button>
        </div>`,
        back: html` <div slot="navigation" data-rounded="top-left">
          <cds-icon-button
            kind="ghost"
            align="bottom-start"
            @click=${action("onClick")}
            enter-delay-ms="0"
            leave-delay-ms="0"
          >
            ${iconLoader(ArrowLeft16, { slot: "icon" })}
            <span slot="tooltip-content">Back</span>
          </cds-icon-button>
        </div>`,
        "custom 1": html` <div slot="navigation" data-rounded="top-left">
          <cds-overflow-menu
            size="md"
            index="1"
            kind="ghost"
            align="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
          >
            ${iconLoader(OverflowMenuVertical16, {
              class: "overflow-menu-svg",
              slot: "icon",
            })}
            <span slot="tooltip-content"> Menu </span>
            <cds-overflow-menu-body>
              <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
              <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
              <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
              <cds-overflow-menu-item disabled=""
                >Clone and move app</cds-overflow-menu-item
              >
              <cds-overflow-menu-item
                >Edit routes and access</cds-overflow-menu-item
              >
              <cds-overflow-menu-item divider="" danger=""
                >Delete app</cds-overflow-menu-item
              >
            </cds-overflow-menu-body>
          </cds-overflow-menu>
        </div>`,
        "custom 2": html` <div slot="navigation" data-rounded="top-left">
          <cds-button @click=${action("onClick")} size="md">test</cds-button>
        </div>`,
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Navigation slot in the toolbar component. `slot='navigation'`",
    },
    fixedActions: {
      control: "select",
      options: ["content switcher", "custom 1", "none"],
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
        "custom 1": html` <div slot="fixed-actions">
          <cds-button @click=${action("onClick")} size="md">test</cds-button>
        </div>`,
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Fixed actions slot for toolbar component. `slot='fixed-actions'`",
    },
    overflow: {
      control: "boolean",
      description:
        "Option to overflow non fixed actions into an overflow menu.",
    },
    actions: {
      control: "select",
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        "Select which predefined set of actions to render in the Toolbar component.",
    },
    aiLabel: {
      table: { category: "slot" },
      control: "boolean",
      description: "AI Label slot in the toolbar component `slot='decorator'`",
    },
    "--cds-aichat-border-radius": {
      control: "boolean",
      description:
        "Setting this property with 8px will apply the border radius to the toolbar component.",
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
    title: "default",
    overflow: true,
    actions: "Advanced list",
    navigation: "home",
    fixedActions: "none",
    aiLabel: true,
    "--cds-aichat-border-radius": false,
  },

  render: ({
    title,
    overflow,
    actions,
    aiLabel,
    navigation,
    fixedActions,
    "--cds-aichat-border-radius": borderRadius,
  }) => html`
    <cds-aichat-toolbar
      .actions=${actions}
      ?overflow=${overflow}
      style=${borderRadius ? "--cds-aichat-border-radius: 8px;" : ""}
    >
      <!-- Navigation slot -->
      ${navigation}

      <!-- Title slot -->
      ${title}

      <!-- Fixed actions slot -->
      ${fixedActions}

      <!-- AI Label slot -->
      ${aiLabel
        ? html` <cds-ai-label
            size="2xs"
            autoalign
            alignment="bottom"
            slot="decorator"
          >
            <div
              role="dialog"
              slot="body-text"
              class="cds-aichat-explainability-popover--content"
            >
              <header
                class="cds-aichat-explainability-popover--content__header"
              >
                <div
                  class="cds-aichat-explainability-popover--content__eyebrow-row"
                >
                  <span
                    class="cds-aichat-explainability-popover--content__label"
                  >
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
                  High level 1-2 sentence description of how the AI is being
                  used in the UI.
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
                    <span slot="icon">${iconLoader(Launch16)}</span>
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
          </cds-ai-label>`
        : ""}
    </cds-aichat-toolbar>
  `,
};

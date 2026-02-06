/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "../index";
import { html } from "lit";
import styles from "./story-styles.scss?lit";

import { historyItemActions, pinnedHistoryItemActions } from "./story-data";

import PinFilled16 from "@carbon/icons/es/pin--filled/16.js";
import Search16 from "@carbon/icons/es/search/16.js";
import Time16 from "@carbon/icons/es/time/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

export default {
  title: "Unstable/Chat History",
  component: "cds-aichat-history-shell",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <cds-aichat-history-shell>${story()}</cds-aichat-history-shell>
    `,
  ],
};

export const Default = {
  argTypes: {
    HeaderTitle: {
      control: "text",
      description: "Header title text of the chat history shell",
    },
  },
  args: {
    HeaderTitle: "Conversations",
  },
  render: (args) => {
    return html` <cds-aichat-history-header
        title="${args.HeaderTitle}"
      ></cds-aichat-history-header>
      <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
      <cds-aichat-history-content>
        <cds-aichat-history-panel aria-label="Chat history">
          <cds-aichat-history-panel-items>
            <cds-aichat-history-panel-menu expanded title="Pinned">
              ${iconLoader(PinFilled16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item
                .actions=${pinnedHistoryItemActions}
              >
                Here's the onboarding doc that includes all the information to
                get started.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item
                selected
                .actions=${pinnedHistoryItemActions}
              >
                Let's use this as the master invoice document.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item
                .actions=${pinnedHistoryItemActions}
              >
                Noticed some discrepancies between these two files.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item
                .actions=${pinnedHistoryItemActions}
              >
                Do we need a PO number on every documentation here?
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>

            <cds-aichat-history-panel-menu expanded title="Today">
              ${iconLoader(Time16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Here's the onboarding doc that includes all the information to
                get started.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Let's use this as the master invoice document.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Noticed some discrepancies between these two files.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Do we need a PO number on every documentation here?
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>

            <cds-aichat-history-panel-menu expanded title="Yesterday">
              ${iconLoader(Time16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Here's the onboarding doc that includes all the information to
                get started.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Let's use this as the master invoice document.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Noticed some discrepancies between these two files.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Do we need a PO number on every documentation here?
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>

            <cds-aichat-history-panel-menu expanded title="Previous 7 days">
              ${iconLoader(Time16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Here's the onboarding doc that includes all the information to
                get started.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Let's use this as the master invoice document.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Noticed some discrepancies between these two files.
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item .actions=${historyItemActions}>
                Do we need a PO number on every documentation here?
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>
          </cds-aichat-history-panel-items>
        </cds-aichat-history-panel>
      </cds-aichat-history-content>`;
  },
};

export const SearchResults = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return html`
      <cds-aichat-history-header
        title="${args.HeaderTitle}"
      ></cds-aichat-history-header>
      <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
      <cds-aichat-history-content>
        <div slot="results-count">Results: 4</div>
        <cds-aichat-history-panel aria-label="Search results">
        <cds-aichat-history-panel-items>
          <cds-aichat-history-panel-menu expanded title="Search results">
            ${iconLoader(Search16, {
              slot: "title-icon",
            })}
            <cds-aichat-history-search-item date="Monday, 12:04 PM">
              Here's the onboarding doc that includes all the information to
              get started.
            </cds-aichat-history-search-item>
            <cds-aichat-history-search-item date="Monday, 12:04 PM">
              Let's use this as the master invoice document.
            </cds-aichat-history-search-item>
            <cds-aichat-history-search-item date="Monday, 12:04 PM">
              Noticed some discrepancies between these two files.
            </cds-aichat-history-search-item>
            <cds-aichat-history-search-item date="Monday, 12:04 PM">
              Do we need a PO number on every documentation here?
            </cds-aichat-history-search-item>
          </cds-aichåat-history-panel-menu>
        </cds-aichat-history-panel-items>
        </cds-aichat-history-panel>
      </cds-aichat-history-content>
    `;
  },
};

export const Loading = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return html`
      <cds-aichat-history-header
        title="${args.HeaderTitle}"
      ></cds-aichat-history-header>
      <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
      <cds-aichat-history-loading></cds-aichat-history-loading>
    `;
  },
};

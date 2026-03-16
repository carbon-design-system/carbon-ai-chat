/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "../index";
import { LitElement, html, css } from "lit";
import styles from "./story-styles.scss?lit";

import {
  historyItemActions,
  pinnedHistoryItemActions,
  pinnedHistoryItems,
  historyItems,
} from "./story-data";

import PinFilled16 from "@carbon/icons/es/pin--filled/16.js";
import Search16 from "@carbon/icons/es/search/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

class ChatHistoryDemo extends LitElement {
  static properties = {
    headerTitle: { type: String, attribute: "header-title" },
    searchResults: { type: Array },
    searchTotalCount: { type: Number },
    searchValue: { type: String },
    searchOff: { type: Boolean, attribute: "search-off" },
    showCloseAction: { type: Boolean, attribute: "show-close-action" },
    showDeletePanel: { type: Boolean },
    itemToDelete: { type: String },
    pinnedItems: { type: Array },
    regularItems: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
      block-size: 100%;
    }
  `;

  constructor() {
    super();
    this.headerTitle = "Conversations";
    this.searchOff = false;
    this.showCloseAction = true;
    this.startPanel = false;
    this.searchResults = [];
    this.searchTotalCount = 0;
    this.searchValue = "";
    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.pinnedItems = [...pinnedHistoryItems];
    this.regularItems = historyItems.map((section) => ({
      ...section,
      chats: [...section.chats],
    }));
  }

  firstUpdated() {
    // Add event listeners after first render
    this.addEventListener(
      "history-item-menu-action",
      this._handleHistoryItemAction,
    );
    this.addEventListener("cds-search-input", this._handleSearchInput);
    this.addEventListener("history-delete-cancel", this._handleDeleteCancel);
    this.addEventListener("history-delete-confirm", this._handleDeleteConfirm);
  }

  _handleHistoryItemAction = (event) => {
    const action = event.detail.action;

    if (action === "Delete") {
      this.itemToDelete = event.detail.itemId;
      this.showDeletePanel = true;
    } else if (action === "Rename") {
      const element = event.detail.element;
      if (element) {
        element.rename = true;
      }
    }
  };

  _handleDeleteCancel = () => {
    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.requestUpdate();
  };

  _handleDeleteConfirm = () => {
    if (this.itemToDelete) {
      // Remove from pinned items
      this.pinnedItems = this.pinnedItems.filter(
        (item) => item.id !== this.itemToDelete,
      );

      // Remove from regular items
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.filter((chat) => chat.id !== this.itemToDelete),
      }));
    }

    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.requestUpdate();
  };

  _handleSearchInput = (event) => {
    const searchValue = event.detail.value.toLowerCase();

    // Combine all results into a single array
    const results = [];

    // Add matching pinned items
    pinnedHistoryItems.forEach((item) => {
      if (item.title.toLowerCase().includes(searchValue)) {
        results.push({
          ...item,
          isPinned: true,
        });
      }
    });

    // Add matching history items
    historyItems.forEach((section) => {
      section.chats.forEach((chat) => {
        if (chat.title.toLowerCase().includes(searchValue)) {
          results.push({
            ...chat,
            section: section.section,
            isPinned: false,
          });
        }
      });
    });

    this.searchResults = results;
    this.searchTotalCount = results.length;
    this.searchValue = searchValue;
  };

  render() {
    const showSearchResults = this.searchTotalCount > 0 && this.searchValue;
    const noSearchResults = this.searchTotalCount === 0 && this.searchValue;

    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          title="${this.headerTitle}"
          ?show-close-action=${this.showCloseAction}
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar ?search-off=${this.searchOff}>
        </cds-aichat-history-toolbar>
        <cds-aichat-history-content>
          ${showSearchResults || noSearchResults
            ? html`<div slot="results-count">
                Results: ${this.searchTotalCount}
              </div>`
            : ""}
          <cds-aichat-history-panel aria-label="Chat history">
            <cds-aichat-history-panel-items>
              ${noSearchResults
                ? html`
                    <cds-aichat-history-panel-menu
                      expanded
                      title="Search results"
                    >
                      ${iconLoader(Search16, {
                        slot: "title-icon",
                      })}
                      <cds-aichat-history-search-item disabled>
                        No available chats
                      </cds-aichat-history-search-item>
                    </cds-aichat-history-panel-menu>
                  `
                : ""}
              ${showSearchResults
                ? html`
                    <cds-aichat-history-panel-menu
                      expanded
                      title="Search results"
                    >
                      ${iconLoader(Search16, {
                        slot: "title-icon",
                      })}
                      ${this.searchResults.map(
                        (result) => html`
                          <cds-aichat-history-search-item
                            date="${result.lastUpdated}"
                          >
                            ${result.title}
                          </cds-aichat-history-search-item>
                        `,
                      )}
                    </cds-aichat-history-panel-menu>
                  `
                : ""}
              ${!showSearchResults && !noSearchResults
                ? html`
                    <cds-aichat-history-panel-menu expanded title="Pinned">
                      ${iconLoader(PinFilled16, {
                        slot: "title-icon",
                      })}
                      ${this.pinnedItems.map(
                        (item) => html`
                          <cds-aichat-history-panel-item
                            id="${item.id}"
                            title="${item.title}"
                            ?selected=${item.selected}
                            ?rename=${item.rename}
                            .actions=${pinnedHistoryItemActions}
                          ></cds-aichat-history-panel-item>
                        `,
                      )}
                    </cds-aichat-history-panel-menu>
                    ${this.regularItems.map(
                      (item) => html`
                        <cds-aichat-history-panel-menu
                          expanded
                          title="${item.section}"
                        >
                          ${item.icon}
                          ${item.chats.map(
                            (chat) => html`
                              <cds-aichat-history-panel-item
                                id="${chat.id}"
                                title="${chat.title}"
                                .actions=${historyItemActions}
                              ></cds-aichat-history-panel-item>
                            `,
                          )}
                        </cds-aichat-history-panel-menu>
                      `,
                    )}
                  `
                : ""}
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        ${this.showDeletePanel
          ? html`
              <cds-aichat-history-delete-panel></cds-aichat-history-delete-panel>
            `
          : ""}
      </cds-aichat-history-shell>
    `;
  }
}

// Register the demo component
if (!customElements.get("cds-aichat-history-demo")) {
  customElements.define("cds-aichat-history-demo", ChatHistoryDemo);
}

export default {
  title: "Unstable/Chat History",
  component: "cds-aichat-history-shell",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <div class="chat-history-story-container">${story()}</div>
    `,
  ],
};

export const Default = {
  argTypes: {
    HeaderTitle: {
      control: "text",
      description: "Header title text of the chat history shell",
    },
    searchOff: {
      control: "boolean",
      description:
        "true if search should be turned off in chat history toolbar.",
    },
    showCloseAction: {
      control: "boolean",
      description: "renders close chat history action in header.",
    },
  },
  args: {
    HeaderTitle: "Conversations",
    searchOff: false,
    showCloseAction: true,
  },
  render: (args) => html`
    <cds-aichat-history-demo
      header-title="${args.HeaderTitle}"
      ?search-off=${args.searchOff}
      ?show-close-action=${args.showCloseAction}
    ></cds-aichat-history-demo>
  `,
};

export const SearchResults = {
  render: () => {
    return html`
    <cds-aichat-history-shell>
      <cds-aichat-history-header
        title="Chats"
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
    </cds-aichat-history-shell>
    `;
  },
};

export const Loading = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          title="${args.HeaderTitle}"
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
        <cds-aichat-history-loading></cds-aichat-history-loading>
      </cds-aichat-history-shell>
    `;
  },
};

export const EmptyState = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          title="${args.HeaderTitle}"
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
        <cds-aichat-history-content>
          <div slot="results-count">No available chats</div>
        </cds-aichat-history-content>
      </cds-aichat-history-shell>
    `;
  },
};

export const DeleteFlow = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          title="${args.HeaderTitle}"
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
        <cds-aichat-history-content>
          <cds-aichat-history-panel>
            <cds-aichat-history-panel-items>
              <cds-aichat-history-panel-menu expanded title="Pinned">
                ${iconLoader(PinFilled16, {
                  slot: "title-icon",
                })}
                ${pinnedHistoryItems.map(
                  (item) => html`
                    <cds-aichat-history-panel-item
                      id="${item.id}"
                      title="${item.title}"
                      ?selected=${item.selected}
                      ?rename=${item.rename}
                      .actions=${pinnedHistoryItemActions}
                    ></cds-aichat-history-panel-item>
                  `,
                )}
              </cds-aichat-history-panel-menu>
              ${historyItems.map(
                (item) => html`
                  <cds-aichat-history-panel-menu
                    expanded
                    title="${item.section}"
                  >
                    ${item.icon}
                    ${item.chats.map(
                      (chat) => html`
                        <cds-aichat-history-panel-item
                          id="${chat.id}"
                          title="${chat.title}"
                          .actions=${historyItemActions}
                        ></cds-aichat-history-panel-item>
                      `,
                    )}
                  </cds-aichat-history-panel-menu>
                `,
              )}
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        <cds-aichat-history-delete-panel></cds-aichat-history-delete-panel>
      </cds-aichat-history-shell>
    `;
  },
};

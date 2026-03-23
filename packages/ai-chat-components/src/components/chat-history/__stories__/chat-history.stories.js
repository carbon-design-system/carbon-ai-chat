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

// Return id of selected chat item or undefined if no item is selected
const findSelectedItemId = (pinnedItems, regularItems) => {
  // Check pinned items
  const selectedPinned = pinnedItems.find((item) => item.selected);
  if (selectedPinned) {
    return selectedPinned.id;
  }

  // Checked regular items
  for (const section of regularItems) {
    const selectedChat = section.chats.find((chat) => chat.selected);
    if (selectedChat) {
      return selectedChat.id;
    }
  }

  return undefined;
};

// Returns index that a chat item should be inserted within section ordered by descending lastUpdated timestamp
const getIndexByTimestamp = (items, timestamp) => {
  const index = items.findIndex(
    (item) => timestamp >= Date.parse(item.lastUpdated),
  );
  return index === -1 ? items.length : index;
};

class ChatHistoryDemo extends LitElement {
  static properties = {
    headerTitle: { type: String, attribute: "header-title" },
    searchResults: { type: Array },
    searchTotalCount: { type: Number },
    searchValue: { type: String },
    searchOff: { type: Boolean, attribute: "search-off" },
    selectedId: { type: String },
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
    this.selectedId = findSelectedItemId(pinnedHistoryItems, historyItems);
    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.pinnedItems = pinnedHistoryItems.map((item) => ({
      ...item,
      rename: false,
    }));
    this.regularItems = historyItems.map((section) => ({
      ...section,
      chats: section.chats.map((chat) => ({ ...chat, rename: false })),
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
    this.addEventListener("history-item-selected", this._handleSelectChat);
    this.addEventListener(
      "history-panel-item-input-save",
      this._handleRenameSave,
    );
  }

  _handleSelectChat = (event) => {
    const itemId = event.detail.itemId;

    if (this.selectedId === itemId) {
      return;
    }

    const itemExists =
      this.pinnedItems.some((item) => item.id === itemId) ||
      this.regularItems.some((section) =>
        section.chats.some((chat) => chat.id === itemId),
      );

    if (itemExists) {
      this.selectedId = itemId;

      // Update pinned items
      this.pinnedItems = this.pinnedItems.map((item) => ({
        ...item,
        selected: item.id === itemId,
      }));

      // Update regular items
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.map((chat) => ({
          ...chat,
          selected: chat.id === itemId,
        })),
      }));
    }
  };

  _handlePinToTop = (itemId) => {
    const itemToPin = this.regularItems
      .flatMap((section) => section.chats)
      .find((chat) => chat.id === itemId);

    if (itemToPin !== undefined) {
      // Remove from regular items
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.filter((chat) => chat.id !== itemToPin.id),
      }));

      // Add to start of pinned items
      this.pinnedItems = [
        { ...itemToPin, isPinned: true },
        ...this.pinnedItems,
      ];
      this.requestUpdate();
    }
  };

  _handleUnpin = (itemId) => {
    const itemToUnpin = this.pinnedItems.find((chat) => chat.id === itemId);

    if (itemToUnpin !== undefined) {
      // Remove from pinned items
      this.pinnedItems = this.pinnedItems.filter(
        (chat) => chat.id !== itemToUnpin.id,
      );

      // Add to regular items
      const now = new Date("Feb 10, 7:30 PM");
      const today = now.setHours(0, 0, 0, 0);
      const yesterday = today - 24 * 60 * 60 * 1000;
      const itemToUnpinTs = Date.parse(itemToUnpin.lastUpdated);

      let sectionMatch = "";
      if (itemToUnpinTs > today) {
        sectionMatch = "Today";
      } else if (itemToUnpinTs > yesterday) {
        sectionMatch = "Yesterday";
      } else {
        sectionMatch = "Previous 7 days";
      }

      const newRegularItems = this.regularItems.map((item) => {
        if (item.section === sectionMatch) {
          const index = getIndexByTimestamp(item.chats, itemToUnpinTs);
          const chats = [...item.chats];
          chats.splice(index, 0, { ...itemToUnpin, isPinned: false });
          return {
            ...item,
            chats,
          };
        }
        return item;
      });

      this.regularItems = newRegularItems;
      this.requestUpdate();
    }
  };

  _handleHistoryItemAction = (event) => {
    const action = event.detail.action;

    switch (action) {
      case "Delete":
        this.itemToDelete = event.detail.itemId;
        this.showDeletePanel = true;
        break;
      case "Rename":
        if (event.detail.element) {
          event.detail.element.rename = true;
        }
        break;
      case "Pin to top":
        this._handlePinToTop(event.detail.itemId);
        break;
      case "Unpin":
        this._handleUnpin(event.detail.itemId);
        break;
      default:
        break;
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

  _handleRenameSave = (event) => {
    const itemId = event.detail.itemId;

    if (itemId) {
      this.pinnedItems = this.pinnedItems.map((chat) =>
        chat.id === itemId
          ? {
              ...chat,
              name: event.detail.newName,
            }
          : chat,
      );

      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.map((chat) =>
          chat.id === itemId
            ? {
                ...chat,
                name: event.detail.newName,
              }
            : chat,
        ),
      }));
    }
  };

  _handleSearchInput = (event) => {
    const inputValue = event.detail.value.toLowerCase();

    // Combine all results into a single array
    const results = [];

    // Add matching pinned items
    this.pinnedItems.forEach((item) => {
      if (item.name.toLowerCase().includes(inputValue)) {
        results.push({
          ...item,
          isPinned: true,
        });
      }
    });

    // Add matching history items
    this.regularItems.forEach((section) => {
      section.chats.forEach((chat) => {
        if (chat.name.toLowerCase().includes(inputValue)) {
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
    this.searchValue = inputValue;
  };

  render() {
    const showSearchResults = this.searchTotalCount > 0 && this.searchValue;
    const noSearchResults = this.searchTotalCount === 0 && this.searchValue;

    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          header-title="${this.headerTitle}"
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
                            name="${result.name}"
                            date="${result.lastUpdated}"
                          >
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
                            name="${item.name}"
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
                                name="${chat.name}"
                                ?selected=${chat.selected}
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
        header-title="Chats"
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
          header-title="${args.HeaderTitle}"
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
          header-title="${args.HeaderTitle}"
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
          header-title="${args.HeaderTitle}"
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
                      name="${item.name}"
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
                          name="${chat.name}"
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

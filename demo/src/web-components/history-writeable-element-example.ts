/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "@carbon/ai-chat-components/es/components/chat-history/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";

import { ChatInstance, PanelType } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import PinFilled16 from "@carbon/icons/es/pin--filled/16.js";
import Search16 from "@carbon/icons/es/search/16.js";
import Delete16 from "@carbon/icons/es/delete/16.js";

// Returns index of a chat item in a section when ordered (descending) by lastUpdated timestamp
const getIndexByTimestamp = (items: resultItem[], timestamp: number) => {
  const index = items.findIndex(
    (item) => timestamp >= Date.parse(item.lastUpdated),
  );
  return index === -1 ? items.length : index;
};

// Returns id of the currently selected item in the history panel
const findSelectedItemId = (
  pinnedItems: resultItem[],
  regularItems: resultItemSection[],
): string | undefined => {
  const selectedPinned = pinnedItems.find((item) => item.selected);
  if (selectedPinned) {
    return selectedPinned.id;
  }

  for (const section of regularItems) {
    const selectedChat = section.chats.find((chat) => chat.selected);
    if (selectedChat) {
      return selectedChat.id;
    }
  }

  return undefined;
};

interface resultItem {
  id: string;
  name: string;
  lastUpdated: string;
  isPinned: boolean;
  selected?: boolean;
  rename?: boolean;
  messages?: any[];
}

interface resultItemSection {
  section: string;
  chats: resultItem[];
}

const historyItemActions = [
  {
    text: "Pin to top",
  },
  {
    text: "Rename",
  },
  {
    text: "Delete",
    delete: true,
    divider: true,
    icon: iconLoader(Delete16, { slot: "icon" }),
  },
];

const pinnedHistoryItemActions = [
  {
    text: "Unpin",
  },
  {
    text: "Rename",
  },
  {
    text: "Delete",
    delete: true,
    divider: true,
    icon: iconLoader(Delete16, { slot: "icon" }),
  },
];

const pinnedHistoryItems: resultItem[] = [
  {
    id: "pinned-0",
    name: "Here's the onboarding doc that includes all the information to get started.",
    lastUpdated: "Feb 10, 6:30 PM",
    isPinned: true,
  },
  {
    id: "pinned-1",
    name: "Let's use this as the master invoice document.",
    selected: true,
    lastUpdated: "Feb 10, 5:45 PM",
    isPinned: true,
  },
  {
    id: "pinned-2",
    name: "Noticed some discrepancies between these two files.",
    lastUpdated: "Feb 10, 4:20 PM",
    isPinned: true,
  },
  {
    id: "pinned-3",
    name: "Do we need a PO number on every documentation here?",
    lastUpdated: "Feb 10, 3:10 PM",
    isPinned: true,
  },
];

const historyItems: resultItemSection[] = [
  {
    section: "Today",
    chats: [
      {
        id: "today-0",
        name: "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 10, 6:30 PM",
        isPinned: false,
      },
      {
        id: "today-1",
        name: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 10, 5:45 PM",
        isPinned: false,
      },
      {
        id: "today-2",
        name: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 10, 4:20 PM",
        isPinned: false,
      },
      {
        id: "today-3",
        name: "Do we need a PO number on every documentation here?",
        lastUpdated: "Feb 10, 3:10 PM",
        isPinned: false,
      },
    ],
  },
  {
    section: "Yesterday",
    chats: [
      {
        id: "yesterday-0",
        name: "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 9, 8:15 PM",
        isPinned: false,
      },
      {
        id: "yesterday-1",
        name: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 9, 6:30 PM",
        isPinned: false,
      },
      {
        id: "yesterday-2",
        name: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 9, 4:45 PM",
        isPinned: false,
      },
      {
        id: "yesterday-3",
        name: "Let's troubleshoot this.",
        lastUpdated: "Feb 9, 2:20 PM",
        isPinned: false,
      },
    ],
  },
  {
    section: "Previous 7 days",
    chats: [
      {
        id: "previous-0",
        name: "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 5, 7:00 PM",
        isPinned: false,
      },
      {
        id: "previous-1",
        name: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 4, 4:30 PM",
        isPinned: false,
      },
      {
        id: "previous-2",
        name: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 4, 2:15 PM",
        isPinned: false,
      },
      {
        id: "previous-3",
        name: "Let's troubleshoot this.",
        lastUpdated: "Feb 3, 11:45 AM",
        isPinned: false,
      },
    ],
  },
];

/**
 * `HistoryWriteableElementExample` demonstrates how to use the history components
 * in a web component context.
 */
@customElement("history-writeable-element-example")
export class HistoryWriteableElementExample extends LitElement {
  static styles = css`
    :host {
      display: block;
      block-size: 100%;

      cds-aichat-history-shell {
        box-sizing: border-box;
        block-size: 100%;
        border-block-start: none;
      }
    }
  `;

  @property({ type: Object })
  accessor instance!: ChatInstance;

  @property({ type: Boolean })
  accessor isMobile: boolean = false;

  @state()
  accessor itemToDelete: string | null = null;

  @state()
  accessor selectedChatId: string | undefined = findSelectedItemId(
    pinnedHistoryItems,
    historyItems,
  );

  @state()
  accessor searchValue: string = "";

  @state()
  accessor searchResults: resultItem[] = [];

  @state()
  accessor showDeletePanel: boolean = false;

  @state()
  accessor pinnedItems: resultItem[] = pinnedHistoryItems.map((item) => ({
    ...item,
    rename: false,
  }));

  @state()
  accessor regularItems: resultItemSection[] = historyItems.map((section) => ({
    ...section,
    chats: section.chats.map((chat) => ({ ...chat, rename: false })),
  }));

  // Handle select chat
  _handleSelectChat = (event: CustomEvent) => {
    const itemId = event.detail.itemId;

    if (this.selectedChatId === itemId) {
      return;
    }

    const itemExists =
      this.pinnedItems.some((item) => item.id === itemId) ||
      this.regularItems.some((section) =>
        section.chats.some((chat) => chat.id === itemId),
      );

    if (itemExists) {
      this.selectedChatId = itemId;

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

      // Dispatch load chat event
      const init = {
        bubbles: true,
        composed: true,
        detail: {
          chatName: event.detail.itemName,
        },
      };

      const loadChatEvent = new CustomEvent("history-panel-load-chat", init);
      this.dispatchEvent(loadChatEvent);
    }
  };

  // Handle pin chat
  _handlePinToTop = (itemId: string) => {
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

  // Handle unpin chat
  _handleUnpin = (itemId: string) => {
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

  // Handle delete panel cancel
  _handleDeleteCancel = () => {
    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.requestUpdate();
  };

  // Handle delete panel confirm
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

  // Handle rename chat save
  _handleRenameSave = (event: CustomEvent) => {
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

  // Handle chat action event
  _handleHistoryItemAction = (event: CustomEvent) => {
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

  // Handle search input event
  _handleSearchInput = (event: CustomEvent) => {
    const inputValue = event.detail.value.toLowerCase();

    // Combine all results into a single array
    const results: any[] = [];

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
    this.searchValue = inputValue;
  };

  // Handle new chat
  _handleNewChat = () => {
    window.alert("Creating new chat");
    // Create new conversation - you would typically call your API here
    // For demo purposes, we'll just alert it
  };

  // Handle close history panel
  _handleHistoryClose = () => {
    if (this.instance?.customPanels) {
      this.instance.customPanels.getPanel(PanelType.HISTORY)?.close();
    }
  };

  get historyItemActions() {
    return [
      { text: "Rename" },
      { text: "Pin" },
      {
        text: "Delete",
        delete: true,
        divider: true,
        icon: iconLoader(Delete16, { slot: "icon" }),
      },
    ];
  }

  get pinnedHistoryItemActions() {
    return [
      { text: "Rename" },
      { text: "Unpin" },
      {
        text: "Delete",
        delete: true,
        divider: true,
        icon: iconLoader(Delete16, { slot: "icon" }),
      },
    ];
  }

  get showSearchResults() {
    return this.searchResults.length > 0 && this.searchValue;
  }

  get noSearchResults() {
    return this.searchResults.length === 0 && this.searchValue;
  }

  render() {
    return html`
      <cds-aichat-history-shell>
        <cds-aichat-history-header
          header-title="Conversations"
          ?show-close-action=${this.isMobile}
          @history-header-close-click=${this._handleHistoryClose}
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar
          @chat-history-new-chat-click=${this._handleNewChat}
          @cds-search-input=${this._handleSearchInput}
        ></cds-aichat-history-toolbar>
        <cds-aichat-history-content>
          ${this.showSearchResults || this.noSearchResults
            ? html`<div slot="results-count">
                Results: ${this.searchResults.length}
              </div>`
            : ""}
          <cds-aichat-history-panel aria-label="Chat history">
            <cds-aichat-history-panel-items>
              ${this.noSearchResults
                ? html`
                    <cds-aichat-history-panel-menu
                      expanded
                      title="Search results"
                    >
                      ${iconLoader(Search16, { slot: "title-icon" })}
                      <cds-aichat-history-search-item disabled>
                        No available chats
                      </cds-aichat-history-search-item>
                    </cds-aichat-history-panel-menu>
                  `
                : ""}
              ${this.showSearchResults
                ? html`
                    <cds-aichat-history-panel-menu
                      expanded
                      title="Search results"
                    >
                      ${iconLoader(Search16, { slot: "title-icon" })}
                      ${this.searchResults.map(
                        (result) => html`
                          <cds-aichat-history-search-item
                            id=${result.id}
                            date=${result.lastUpdated}
                            @history-search-item-selected=${this
                              ._handleSelectChat}
                          >
                            ${result.name}
                          </cds-aichat-history-search-item>
                        `,
                      )}
                    </cds-aichat-history-panel-menu>
                  `
                : ""}
              ${!this.showSearchResults && !this.noSearchResults
                ? html`
                    <cds-aichat-history-panel-menu expanded title="Pinned">
                      ${iconLoader(PinFilled16, { slot: "title-icon" })}
                      ${this.pinnedItems.map(
                        (chat) => html`
                          <cds-aichat-history-panel-item
                            id=${chat.id}
                            name=${chat.name}
                            ?selected=${chat.selected}
                            ?rename=${chat.rename}
                            .actions=${pinnedHistoryItemActions}
                            @history-item-selected=${this._handleSelectChat}
                            @history-item-menu-action=${this
                              ._handleHistoryItemAction}
                            @history-panel-item-input-save=${this
                              ._handleRenameSave}
                          ></cds-aichat-history-panel-item>
                        `,
                      )}
                    </cds-aichat-history-panel-menu>
                    ${this.regularItems.map(
                      (section) => html`
                        <cds-aichat-history-panel-menu
                          expanded
                          title=${section.section}
                        >
                          ${iconLoader(Search16, { slot: "title-icon" })}
                          ${section.chats.map(
                            (chat) => html`
                              <cds-aichat-history-panel-item
                                id=${chat.id}
                                name=${chat.name}
                                ?selected=${chat.selected}
                                ?rename=${chat.rename}
                                .actions=${historyItemActions}
                                @history-item-selected=${this._handleSelectChat}
                                @history-item-menu-action=${this
                                  ._handleHistoryItemAction}
                                @history-panel-item-input-save=${this
                                  ._handleRenameSave}
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
              <cds-aichat-history-delete-panel
                @history-delete-cancel=${this._handleDeleteCancel}
                @history-delete-confirm=${this._handleDeleteConfirm}
              >
                <div slot="title">Confirm Delete</div>
                <div slot="description">
                  This conversation will be permanently deleted.
                </div>
              </cds-aichat-history-delete-panel>
            `
          : ""}
      </cds-aichat-history-shell>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "history-writeable-element-example": HistoryWriteableElementExample;
  }
}

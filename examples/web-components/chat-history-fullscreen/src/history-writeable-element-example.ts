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
// icons
import PinFilled16 from "@carbon/icons/es/pin--filled/16.js";
import Search16 from "@carbon/icons/es/search/16.js";

import {
  historyItemActions,
  pinnedHistoryItemActions,
  pinnedHistoryItems,
  historyItems,
  resultItem,
  resultItemSection,
} from "./chat-history-data";

interface SearchResult {
  id: string;
  title: string;
  section?: string;
  isPinned: boolean;
}

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

// Returns index that a chat item should be inserted within section ordered by descending lastUpdated timestamp
const getIndexByTimestamp = (items: resultItem[], timestamp: number) => {
  const index = items.findIndex(
    (item) => timestamp >= Date.parse(item.lastUpdated),
  );
  return index === -1 ? items.length : index;
};

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
      }
    }
  `;

  @property({ type: String })
  accessor location!: string;

  @property({ type: Object })
  accessor instance!: ChatInstance;

  @property({ type: String })
  accessor valueFromParent!: string;

  @property({ type: Boolean })
  accessor isMobile: boolean = false;

  @property({ type: String })
  accessor headerTitle: string = "Conversations";

  @state()
  accessor itemToDelete: string | null = null;

  @state()
  accessor selectedChatId: string = "pinned-1";

  @state()
  accessor searchValue: string = "";

  @state()
  accessor searchResults: SearchResult[] = [];

  @state()
  accessor searchTotalCount: number = 0;

  @state()
  accessor showDeletePanel: Boolean = false;

  @state()
  accessor pinnedItems: resultItem[] =
    pinnedHistoryItems.map((item) => ({ ...item, rename: false })) || [];

  @state()
  accessor regularItems: resultItemSection[] =
    historyItems.map((section) => ({
      ...section,
      chats: section.chats.map((chat) => ({ ...chat, rename: false })),
    })) || [];

  firstUpdated() {
    // Add event listeners after first render
    this.addEventListener("history-delete-cancel", this._handleDeleteCancel);
    this.addEventListener("history-delete-confirm", this._handleDeleteConfirm);
    // this.addEventListener(
    //   "history-panel-item-input-save",
    //   this._handleRenameSave,
    // );
  }

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
    }
  };

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

  _handleRenameSave = (event: CustomEvent) => {
    const itemId = event.detail.itemId;

    if (itemId) {
      this.pinnedItems = this.pinnedItems.map((chat) =>
        chat.id === itemId
          ? {
              ...chat,
              title: event.detail.newTitle,
            }
          : chat,
      );

      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.map((chat) =>
          chat.id === itemId
            ? {
                ...chat,
                title: event.detail.newTitle,
              }
            : chat,
        ),
      }));
    }
  };

  _handleSearchInput = (event: CustomEvent) => {
    const inputValue = event.detail.value.toLowerCase();

    // Combine all results into a single array
    const results: any[] = [];

    // Add matching pinned items
    this.pinnedItems.forEach((item) => {
      if (item.title.toLowerCase().includes(inputValue)) {
        results.push({
          ...item,
          isPinned: true,
        });
      }
    });

    // Add matching history items
    this.regularItems.forEach((section) => {
      section.chats.forEach((chat) => {
        if (chat.title.toLowerCase().includes(inputValue)) {
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
      <cds-aichat-history-shell class="history-writeable-element">
        <cds-aichat-history-header
          title="Conversations"
          ?show-close-action=${this.isMobile}
          @history-header-close-click=${() =>
            console.log("this.handleHistoryClose")}
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar
          @chat-history-new-chat-click=${() =>
            console.log("this.handleNewChat")}
          @cds-search-input=${this._handleSearchInput}
        ></cds-aichat-history-toolbar>
        <cds-aichat-history-content>
          ${showSearchResults || noSearchResults
            ? html`<div slot="results-count">
                Results: ${this.searchResults.length}
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
                      ${iconLoader(Search16, { slot: "title-icon" })}
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
                      ${iconLoader(Search16, { slot: "title-icon" })}
                      ${this.searchResults.map(
                        (result) => html`
                          <cds-aichat-history-search-item
                            id=${result.id}
                            date=${result.section || "Pinned"}
                            @history-search-item-selected=${this
                              ._handleSelectChat}
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
                      ${iconLoader(PinFilled16, { slot: "title-icon" })}
                      ${this.pinnedItems.map(
                        (chat) => html`
                          <cds-aichat-history-panel-item
                            id=${chat.id}
                            title=${chat.title}
                            ?selected=${chat.id === this.selectedChatId}
                            .actions=${pinnedHistoryItemActions}
                            @history-item-selected=${this._handleSelectChat}
                            @history-item-action=${this
                              ._handleHistoryItemAction}
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
                                title=${chat.title}
                                ?selected=${chat.id === this.selectedChatId}
                                .actions=${historyItemActions}
                                @history-item-selected=${this._handleSelectChat}
                                @history-item-action=${this
                                  ._handleHistoryItemAction}
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

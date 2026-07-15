/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `HistoryWriteableElementExample` — custom conversation picker.
 *
 * Demonstrates: composing `cds-aichat-history-*` components inside the
 * `historyPanelElement` writeable-element slot, including search,
 * pin/unpin, rename, and delete flows. Selecting a row dispatches a
 * `history-panel-load-chat` event that the host element handles.
 *
 * APIs exercised:
 *   - `cds-aichat-history-shell` and related history components
 *   - `instance.customPanels.getPanel(PanelType.HISTORY)`
 *
 * Start reading at: `render` and `_handleSelectChat`.
 */

import "@carbon/ai-chat-components/es/components/chat-history/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";

import { ChatInstance, PanelType } from "@carbon/ai-chat";
import { focusElementAfterRepaint } from "@carbon/ai-chat-components/es/globals/utils/focus-utils.js";
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

// Locates the insertion point that keeps a section descending by `lastUpdated`, so re-inserted items land in the correct chronological slot.
const getIndexByTimestamp = (items: resultItem[], timestamp: number) => {
  const index = items.findIndex(
    (item) => timestamp >= Date.parse(item.lastUpdated),
  );
  // No earlier timestamp found means the new item is the oldest; append at the end.
  return index === -1 ? items.length : index;
};

// Seeds the initial selection state by scanning fixtures, so the panel highlights the right row before any user interaction.
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

  @property({ type: Object })
  accessor instance!: ChatInstance;

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

  // Activates a conversation when a row is clicked or chosen via search results.
  _handleSelectChat = (event: CustomEvent) => {
    const itemId = event.detail.itemId;

    // Skip work when the same row is clicked twice; the chat is already loaded.
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

      // Mirror the selection flag onto every pinned row so only the active one renders the selected style.
      this.pinnedItems = this.pinnedItems.map((item) => ({
        ...item,
        selected: item.id === itemId,
      }));

      // Same selection mirroring across the time-bucketed sections to keep visuals in sync.
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.map((chat) => ({
          ...chat,
          selected: chat.id === itemId,
        })),
      }));

      // Bubble + compose so the host `<my-app>` outside this shadow root can observe the selection.
      const init = {
        bubbles: true,
        composed: true,
        detail: {
          chatName: event.detail.itemName,
        },
      };

      const loadChatEvent = new CustomEvent("history-panel-load-chat", init);
      this.dispatchEvent(loadChatEvent);

      // Auto-close the panel after a load mirrors common chat UX where the picker dismisses once a conversation is chosen.
      this._handleHistoryClose();
    }
  };

  // Promotes a regular row into the pinned section.
  _handlePinToTop = (itemId: string) => {
    const itemToPin = this.regularItems
      .flatMap((section) => section.chats)
      .find((chat) => chat.id === itemId);

    if (itemToPin !== undefined) {
      // Drop the row from its old section so it does not appear in two places at once.
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.filter((chat) => chat.id !== itemToPin.id),
      }));

      // Prepend so the most recently pinned item is the easiest to find at the top.
      this.pinnedItems = [
        { ...itemToPin, isPinned: true },
        ...this.pinnedItems,
      ];
      this.requestUpdate();

      // Re-focus the moved row after Lit re-renders so keyboard users do not lose their place.
      focusElementAfterRepaint(
        this.renderRoot,
        `cds-aichat-history-panel-item#${CSS.escape(itemId)}`,
      );
    }
  };

  // Demotes a pinned row back into the appropriate time bucket.
  _handleUnpin = (itemId: string) => {
    const itemToUnpin = this.pinnedItems.find((chat) => chat.id === itemId);

    if (itemToUnpin !== undefined) {
      // Drop from pinned first so the rebuild step never sees the same id twice.
      this.pinnedItems = this.pinnedItems.filter(
        (chat) => chat.id !== itemToUnpin.id,
      );

      // Hard-coded "now" anchors the demo to the fixture timestamps so unpin always lands in a recognizable bucket. Replace with a real production implementation that uses real timestamps.
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
          // Splice into the chronologically correct slot rather than appending so order matches the rest of the section.
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

      // Re-focus the moved row after Lit re-renders so keyboard users do not lose their place.
      focusElementAfterRepaint(
        this.renderRoot,
        `cds-aichat-history-panel-item#${CSS.escape(itemId)}`,
      );
    }
  };

  // Dismisses the delete confirmation overlay without mutating any data.
  _handleDeleteCancel = () => {
    this.showDeletePanel = false;
    // Clearing the staged id prevents a stale value from leaking into the next confirm cycle.
    this.itemToDelete = null;
    this.requestUpdate();
  };

  // Removes the staged conversation from both lists once the user confirms. Replace with a real production implementation that calls the back-end before mutating local state.
  _handleDeleteConfirm = () => {
    if (this.itemToDelete) {
      // Strip from pinned in case the deleted row was pinned.
      this.pinnedItems = this.pinnedItems.filter(
        (item) => item.id !== this.itemToDelete,
      );

      // Strip from every time bucket as well; the row may live in only one but we filter all to keep the code uniform.
      this.regularItems = this.regularItems.map((section) => ({
        ...section,
        chats: section.chats.filter((chat) => chat.id !== this.itemToDelete),
      }));
    }

    this.showDeletePanel = false;
    this.itemToDelete = null;
    this.requestUpdate();
  };

  // Persists an inline rename after the user commits the new value. Replace with a real production implementation that writes the new name to your back-end.
  _handleRenameSave = (event: CustomEvent) => {
    const itemId = event.detail.itemId;

    if (itemId) {
      // Update pinned and regular collections in parallel because the renamed row may live in either.
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

  // Routes action-menu selections to the matching local handler so the component encapsulates all panel-side state changes.
  _handleHistoryItemAction = (event: CustomEvent) => {
    const action = event.detail.action;

    switch (action) {
      case "Delete":
        this.itemToDelete = event.detail.itemId;
        this.showDeletePanel = true;
        break;
      case "Rename":
        // Toggle the row's `rename` flag so the panel item swaps to its inline edit mode in place.
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

  // Builds the flat search-results array consumed by the results menu.
  _handleSearchInput = (event: CustomEvent) => {
    // Lowercase once so each item's `includes` check is case-insensitive without per-item normalization.
    const inputValue = event.detail.value.toLowerCase();

    // Single flat list (rather than re-bucketed sections) keeps the search UI simple and matches the design.
    const results: any[] = [];

    // Pinned matches first so they remain visually prominent in the result list.
    this.pinnedItems.forEach((item) => {
      if (item.name.toLowerCase().includes(inputValue)) {
        results.push({
          ...item,
          isPinned: true,
        });
      }
    });

    // Then regular rows, tagged with their section so result rendering can show grouping context.
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

  // Stub for the toolbar "new chat" button. Replace with a real production implementation that creates a conversation in the back-end.
  _handleNewChat = () => {
    window.alert("Creating new chat");
  };

  // Closes the history panel through the chat instance API so behavior matches the built-in close button.
  _handleHistoryClose = () => {
    if (this.instance?.customPanels) {
      this.instance.customPanels.getPanel(PanelType.HISTORY)?.close();
    }
  };

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
          ?show-close-action=${true}
          @history-header-close-click=${this._handleHistoryClose}
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar
          @chat-history-new-chat-click=${this._handleNewChat}
          @cds-search-input=${this._handleSearchInput}
        ></cds-aichat-history-toolbar>
        <cds-aichat-history-content
          results-label="Results"
          results-count="${
            this.showSearchResults || this.noSearchResults
              ? this.searchResults.length
              : ""
          }"
        >
          <cds-aichat-history-panel aria-label="Chat history">
            <cds-aichat-history-panel-items>
              ${
                this.noSearchResults
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
                  : ""
              }
              ${
                this.showSearchResults
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
                              @history-search-item-selected=${
                                this._handleSelectChat
                              }
                            >
                              ${result.name}
                            </cds-aichat-history-search-item>
                          `,
                        )}
                      </cds-aichat-history-panel-menu>
                    `
                  : ""
              }
              ${
                !this.showSearchResults && !this.noSearchResults
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
                              @history-item-menu-action=${
                                this._handleHistoryItemAction
                              }
                              @history-panel-item-input-save=${
                                this._handleRenameSave
                              }
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
                                  @history-item-menu-action=${
                                    this._handleHistoryItemAction
                                  }
                                  @history-panel-item-input-save=${
                                    this._handleRenameSave
                                  }
                                ></cds-aichat-history-panel-item>
                              `,
                            )}
                          </cds-aichat-history-panel-menu>
                        `,
                      )}
                    `
                  : ""
              }
            </cds-aichat-history-panel-items>
          </cds-aichat-history-panel>
        </cds-aichat-history-content>
        ${
          this.showDeletePanel
            ? html`
                <cds-aichat-history-delete-panel
                  item-id=${this.itemToDelete ?? ""}
                  @history-delete-cancel=${this._handleDeleteCancel}
                  @history-delete-confirm=${this._handleDeleteConfirm}
                >
                  <div slot="title">Confirm Delete</div>
                  <div slot="description">
                    This conversation will be permanently deleted.
                  </div>
                </cds-aichat-history-delete-panel>
              `
            : ""
        }
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

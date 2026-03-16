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

// Sample history data
const PINNED_CHATS = [
  { id: "pinned-1", title: "Important conversation about AI", pinned: true },
  { id: "pinned-2", title: "Project planning discussion", pinned: true },
  { id: "pinned-3", title: "Code review best practices", pinned: true },
];

const HISTORY_SECTIONS = [
  {
    section: "Today",
    chats: [
      { id: "today-1", title: "How to optimize database queries" },
      { id: "today-2", title: "React best practices" },
      { id: "today-3", title: "TypeScript type inference" },
      { id: "today-4", title: "Debugging memory leaks in Node.js" },
      { id: "today-5", title: "Understanding async/await patterns" },
      { id: "today-6", title: "CSS animations and transitions" },
      { id: "today-7", title: "Git branching strategies" },
    ],
  },
  {
    section: "Yesterday",
    chats: [
      { id: "yesterday-1", title: "CSS Grid layout examples" },
      { id: "yesterday-2", title: "API design patterns" },
      { id: "yesterday-3", title: "Testing strategies for React apps" },
      { id: "yesterday-4", title: "Webpack configuration tips" },
      { id: "yesterday-5", title: "Accessibility best practices" },
      { id: "yesterday-6", title: "Performance optimization techniques" },
    ],
  },
  {
    section: "Last 7 days",
    chats: [
      { id: "week-1", title: "Machine learning basics" },
      { id: "week-2", title: "Docker containerization" },
      { id: "week-3", title: "GraphQL vs REST" },
      { id: "week-4", title: "Microservices architecture" },
      { id: "week-5", title: "CI/CD pipeline setup" },
      { id: "week-6", title: "Database indexing strategies" },
      { id: "week-7", title: "Security best practices" },
      { id: "week-8", title: "Cloud deployment options" },
      { id: "week-9", title: "Monitoring and logging" },
      { id: "week-10", title: "Code refactoring techniques" },
    ],
  },
  {
    section: "Last 30 days",
    chats: [
      { id: "month-1", title: "Introduction to Kubernetes" },
      { id: "month-2", title: "Redux state management" },
      { id: "month-3", title: "WebSocket implementation" },
      { id: "month-4", title: "OAuth 2.0 authentication" },
      { id: "month-5", title: "Progressive Web Apps" },
      { id: "month-6", title: "Server-side rendering with Next.js" },
      { id: "month-7", title: "Mobile-first design principles" },
      { id: "month-8", title: "API rate limiting strategies" },
      { id: "month-9", title: "Data visualization with D3.js" },
      { id: "month-10", title: "Serverless architecture patterns" },
    ],
  },
];

interface SearchResult {
  id: string;
  title: string;
  section?: string;
  isPinned: boolean;
}

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

  @state()
  accessor selectedChatId: string = "today-1";

  @state()
  accessor searchValue: string = "";

  @state()
  accessor searchResults: SearchResult[] = [];

  // Handle chat selection
  handleChatSelected = (event: CustomEvent) => {
    const { itemId, itemTitle } = event.detail;
    console.log(`Selected chat: ${itemTitle} (${itemId})`);
    this.selectedChatId = itemId;
    // Here you would typically load the conversation
  };

  // Handle chat actions (rename, delete, pin, etc.)
  handleChatAction = (event: CustomEvent) => {
    const { action, itemTitle, element } = event.detail;

    switch (action) {
      case "Rename":
        element.rename = true;
        break;
      case "Delete":
        console.log(`Deleting chat: ${itemTitle}`);
        // Handle delete
        break;
      case "Pin":
        console.log(`Pinning chat: ${itemTitle}`);
        // Handle pin
        break;
      case "Unpin":
        console.log(`Unpinning chat: ${itemTitle}`);
        // Handle unpin
        break;
      default:
        break;
    }
  };

  // Handle search
  handleSearchInput = (event: CustomEvent) => {
    const value = event.detail.value.toLowerCase();
    this.searchValue = value;

    if (value) {
      // Filter all chats
      const results: SearchResult[] = [];

      // Add matching pinned items
      PINNED_CHATS.forEach((item) => {
        if (item.title.toLowerCase().includes(value)) {
          results.push({
            ...item,
            isPinned: true,
          });
        }
      });

      // Add matching history items
      HISTORY_SECTIONS.forEach((section) => {
        section.chats.forEach((chat) => {
          if (chat.title.toLowerCase().includes(value)) {
            results.push({
              ...chat,
              section: section.section,
              isPinned: false,
            });
          }
        });
      });

      this.searchResults = results;
    } else {
      this.searchResults = [];
    }
  };

  // Handle new chat
  handleNewChat = () => {
    console.log("Creating new chat");
    // Create new conversation - you would typically call your API here
    // For demo purposes, we'll just log it
  };

  // Handle history close
  handleHistoryClose = () => {
    console.log("History close clicked");
    // In float mode, close the history panel
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
      <cds-aichat-history-shell class="history-writeable-element">
        <cds-aichat-history-header
          title="Conversations"
          ?show-close-action=${this.isMobile}
          @history-header-close-click=${this.handleHistoryClose}
        ></cds-aichat-history-header>
        <cds-aichat-history-toolbar
          @chat-history-new-chat-click=${this.handleNewChat}
          @cds-search-input=${this.handleSearchInput}
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
                            date=${result.section || "Pinned"}
                            @history-search-item-selected=${this
                              .handleChatSelected}
                          >
                            ${result.title}
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
                      ${PINNED_CHATS.map(
                        (chat) => html`
                          <cds-aichat-history-panel-item
                            id=${chat.id}
                            title=${chat.title}
                            ?selected=${chat.id === this.selectedChatId}
                            .actions=${this.pinnedHistoryItemActions}
                            @history-item-selected=${this.handleChatSelected}
                            @history-item-action=${this.handleChatAction}
                          ></cds-aichat-history-panel-item>
                        `,
                      )}
                    </cds-aichat-history-panel-menu>
                    ${HISTORY_SECTIONS.map(
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
                                .actions=${this.historyItemActions}
                                @history-item-selected=${this
                                  .handleChatSelected}
                                @history-item-action=${this.handleChatAction}
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

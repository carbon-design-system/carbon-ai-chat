/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable */
import React, { useState, useCallback } from "react";
import {
  HistoryShell,
  HistoryHeader,
  HistoryToolbar,
  HistoryContent,
  HistoryLoading,
  HistoryPanel,
  HistoryPanelMenu,
  HistoryPanelItem,
  HistoryPanelItems,
  HistorySearchItem,
  HistoryDeletePanel,
} from "../../../react/history";
import "./story-styles.scss";

import {
  historyItemActions,
  pinnedHistoryItemActions,
  pinnedHistoryItems,
  historyItems,
} from "./story-data";

import { PinFilled, Search } from "@carbon/icons-react";

export default {
  title: "Unstable/Chat History",
  component: HistoryShell,
  decorators: [
    (Story) => (
      <div className="chat-history-story-container">
        <Story />
      </div>
    ),
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
  render: (args) => {
    const [searchResults, setSearchResults] = useState([]);
    const [searchTotalCount, setSearchTotalCount] = useState(0);
    const [searchValue, setSearchValue] = useState("");
    const [showDeletePanel, setShowDeletePanel] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pinnedItems, setPinnedItems] = useState(
      pinnedHistoryItems.map((item) => ({ ...item, rename: false })),
    );
    const [regularItems, setRegularItems] = useState(
      historyItems.map((section) => ({
        ...section,
        chats: section.chats.map((chat) => ({ ...chat, rename: false })),
      })),
    );

    const handleHistoryItemAction = useCallback((event) => {
      const action = event.detail.action;

      if (action === "Delete") {
        setItemToDelete(event.detail.itemId);
        setShowDeletePanel(true);
      } else if (action === "Rename") {
        const element = event.detail.element;
        if (element) {
          element.rename = true;
        }
      }
    }, []);

    const handleDeleteCancel = useCallback(() => {
      setShowDeletePanel(false);
      setItemToDelete(null);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
      if (itemToDelete) {
        // Remove from pinned items
        setPinnedItems((prev) =>
          prev.filter((item) => item.id !== itemToDelete),
        );

        // Remove from regular items
        setRegularItems((prev) =>
          prev.map((section) => ({
            ...section,
            chats: section.chats.filter((chat) => chat.id !== itemToDelete),
          })),
        );
      }

      setShowDeletePanel(false);
      setItemToDelete(null);
    }, [itemToDelete]);

    const handleSearchInput = useCallback((event) => {
      const searchVal = event.detail.value.toLowerCase();

      // Combine all results into a single array
      const results = [];

      // Add matching pinned items
      pinnedHistoryItems.forEach((item) => {
        if (item.title.toLowerCase().includes(searchVal)) {
          results.push({
            ...item,
            isPinned: true,
          });
        }
      });

      // Add matching history items
      historyItems.forEach((section) => {
        section.chats.forEach((chat) => {
          if (chat.title.toLowerCase().includes(searchVal)) {
            results.push({
              ...chat,
              section: section.section,
              isPinned: false,
            });
          }
        });
      });

      setSearchResults(results);
      setSearchTotalCount(results.length);
      setSearchValue(searchVal);
    }, []);

    const showSearchResults = searchTotalCount > 0 && searchValue;
    const noSearchResults = searchTotalCount === 0 && searchValue;

    return (
      <HistoryShell>
        <HistoryHeader
          title={args.HeaderTitle}
          showCloseAction={args.showCloseAction}
        />
        <HistoryToolbar
          searchOff={args.searchOff}
          onCdsSearchInput={handleSearchInput}
        />
        <HistoryContent>
          {(showSearchResults || noSearchResults) && (
            <div slot="results-count">Results: {searchTotalCount}</div>
          )}
          <HistoryPanel aria-label="Chat history">
            <HistoryPanelItems>
              {noSearchResults && (
                <HistoryPanelMenu expanded title="Search results">
                  <Search slot="title-icon" />
                  <HistorySearchItem disabled>
                    No available chats
                  </HistorySearchItem>
                </HistoryPanelMenu>
              )}
              {showSearchResults && (
                <HistoryPanelMenu expanded title="Search results">
                  <Search slot="title-icon" />
                  {searchResults.map((result) => (
                    <HistorySearchItem
                      key={result.id}
                      date={result.lastUpdated}
                    >
                      {result.title}
                    </HistorySearchItem>
                  ))}
                </HistoryPanelMenu>
              )}
              {!showSearchResults && !noSearchResults && (
                <>
                  <HistoryPanelMenu expanded title="Pinned">
                    <PinFilled slot="title-icon" />
                    {pinnedItems.map((item) => (
                      <HistoryPanelItem
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        selected={item.selected}
                        rename={item.rename}
                        actions={pinnedHistoryItemActions}
                        onHistoryItemMenuAction={handleHistoryItemAction}
                      />
                    ))}
                  </HistoryPanelMenu>
                  {regularItems.map((item) => (
                    <HistoryPanelMenu
                      key={item.section}
                      expanded
                      title={item.section}
                    >
                      <Search slot="title-icon" />
                      {item.chats.map((chat) => (
                        <HistoryPanelItem
                          key={chat.id}
                          id={chat.id}
                          title={chat.title}
                          rename={chat.rename}
                          actions={historyItemActions}
                          onHistoryItemMenuAction={handleHistoryItemAction}
                        />
                      ))}
                    </HistoryPanelMenu>
                  ))}
                </>
              )}
            </HistoryPanelItems>
          </HistoryPanel>
        </HistoryContent>
        {showDeletePanel && (
          <HistoryDeletePanel
            onHistoryDeleteCancel={handleDeleteCancel}
            onHistoryDeleteConfirm={handleDeleteConfirm}
          >
            <div slot="title">Confirm Delete</div>
            <div slot="description">
              This conversation will be permanently deleted.
            </div>
          </HistoryDeletePanel>
        )}
      </HistoryShell>
    );
  },
};

export const SearchResults = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return (
      <HistoryShell>
        <HistoryHeader title={args.HeaderTitle} />
        <HistoryToolbar />
        <HistoryContent>
          <div slot="results-count">Results: 4</div>
          <HistoryPanel aria-label="Search results">
            <HistoryPanelItems>
              <HistoryPanelMenu expanded title="Search results">
                <Search slot="title-icon" />
                <HistorySearchItem date="Monday, 12:04 PM">
                  Here's the onboarding doc that includes all the information to
                  get started.
                </HistorySearchItem>
                <HistorySearchItem date="Monday, 12:04 PM">
                  Let's use this as the master invoice document.
                </HistorySearchItem>
                <HistorySearchItem date="Monday, 12:04 PM">
                  Noticed some discrepancies between these two files.
                </HistorySearchItem>
                <HistorySearchItem date="Monday, 12:04 PM">
                  Do we need a PO number on every documentation here?
                </HistorySearchItem>
              </HistoryPanelMenu>
            </HistoryPanelItems>
          </HistoryPanel>
        </HistoryContent>
      </HistoryShell>
    );
  },
};

export const Loading = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return (
      <HistoryShell>
        <HistoryHeader title={args.HeaderTitle} />
        <HistoryToolbar />
        <HistoryLoading />
      </HistoryShell>
    );
  },
};

export const EmptyState = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return (
      <HistoryShell>
        <HistoryHeader title={args.HeaderTitle} />
        <HistoryToolbar />
        <HistoryContent>
          <div slot="results-count">No available chats</div>
        </HistoryContent>
      </HistoryShell>
    );
  },
};

export const DeleteFlow = {
  args: {
    HeaderTitle: "Chats",
  },
  render: (args) => {
    return (
      <HistoryShell>
        <HistoryHeader title={args.HeaderTitle} />
        <HistoryToolbar />
        <HistoryContent>
          <HistoryPanel aria-label="Chat history">
            <HistoryPanelItems>
              <HistoryPanelMenu expanded title="Pinned">
                <PinFilled slot="title-icon" />
                {pinnedHistoryItems.map((item) => (
                  <HistoryPanelItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    selected={item.selected}
                    actions={pinnedHistoryItemActions}
                  />
                ))}
              </HistoryPanelMenu>
              {historyItems.map((item) => (
                <HistoryPanelMenu
                  key={item.section}
                  expanded
                  title={item.section}
                >
                  <Search slot="title-icon" />
                  {item.chats.map((chat) => (
                    <HistoryPanelItem
                      key={chat.id}
                      id={chat.id}
                      title={chat.title}
                      actions={historyItemActions}
                    />
                  ))}
                </HistoryPanelMenu>
              ))}
            </HistoryPanelItems>
          </HistoryPanel>
        </HistoryContent>
        <HistoryDeletePanel>
          <div slot="title">Confirm Delete</div>
          <div slot="description">
            This conversation will be permanently deleted.
          </div>
        </HistoryDeletePanel>
      </HistoryShell>
    );
  },
};

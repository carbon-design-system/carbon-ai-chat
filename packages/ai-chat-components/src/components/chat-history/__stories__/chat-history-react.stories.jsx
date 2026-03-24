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

const findSelectedItemId = (pinnedItems, regularItems) => {
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
    const [selectedId, setSelectedId] = useState(
      findSelectedItemId(pinnedHistoryItems, historyItems),
    );
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

    const handleSelectChat = (event) => {
      const itemId = event.detail.itemId;

      if (selectedId === itemId) {
        return;
      }

      const itemExists =
        pinnedItems.some((item) => item.id === itemId) ||
        regularItems.some((section) =>
          section.chats.some((chat) => chat.id === itemId),
        );

      if (itemExists) {
        setSelectedId(itemId);

        // Update pinned items
        setPinnedItems((prev) =>
          prev.map((item) => ({
            ...item,
            selected: item.id === itemId,
          })),
        );

        // Update regular items
        setRegularItems((prev) =>
          prev.map((section) => ({
            ...section,
            chats: section.chats.map((chat) => ({
              ...chat,
              selected: chat.id === itemId,
            })),
          })),
        );
      }
    };

    // Returns index that a chat item should be inserted within section ordered by descending lastUpdated timestamp
    const getIndexByTimestamp = (items, timestamp) => {
      const index = items.findIndex(
        (item) => timestamp >= Date.parse(item.lastUpdated),
      );
      return index === -1 ? items.length : index;
    };

    const handlePinToTop = useCallback(
      (itemId) => {
        const itemToPin = regularItems
          .flatMap((section) => section.chats)
          .find((chat) => chat.id === itemId);

        if (itemToPin !== undefined) {
          // Remove from regular items
          setRegularItems((prev) =>
            prev.map((section) => ({
              ...section,
              chats: section.chats.filter((chat) => chat.id !== itemToPin.id),
            })),
          );

          // Add to start of pinned items
          setPinnedItems((prev) => [{ ...itemToPin, isPinned: true }, ...prev]);
        }
      },
      [regularItems],
    );

    const handleUnpin = useCallback(
      (itemId) => {
        const itemToUnpin = pinnedItems.find((chat) => chat.id === itemId);

        if (itemToUnpin !== undefined) {
          // Remove from pinned items
          setPinnedItems((prev) =>
            prev.filter((chat) => chat.id !== itemToUnpin.id),
          );

          // Add to regular items
          setRegularItems((prev) => {
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

            return prev.map((item) => {
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
          });
        }
      },
      [pinnedItems],
    );

    const handleHistoryItemAction = useCallback(
      (event) => {
        const action = event.detail.action;

        switch (action) {
          case "Delete":
            setItemToDelete(event.detail.itemId);
            setShowDeletePanel(true);
            break;
          case "Rename":
            if (event.detail.element) {
              event.detail.element.rename = true;
            }
            break;
          case "Pin to top":
            handlePinToTop(event.detail.itemId);
            break;
          case "Unpin":
            handleUnpin(event.detail.itemId);
            break;
          default:
            break;
        }
      },
      [handlePinToTop, handleUnpin],
    );

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

    const handleRenameSave = useCallback((event) => {
      const itemId = event.detail.itemId;
      if (itemId) {
        setPinnedItems((prev) =>
          prev.map((chat) =>
            chat.id === itemId
              ? {
                  ...chat,
                  name: event.detail.newName,
                }
              : chat,
          ),
        );

        setRegularItems((prev) =>
          prev.map((section) => ({
            ...section,
            chats: section.chats.map((chat) =>
              chat.id === itemId
                ? {
                    ...chat,
                    name: event.detail.newName,
                  }
                : chat,
            ),
          })),
        );
      }
    }, []);

    const handleSearchInput = useCallback(
      (event) => {
        const searchVal = event.detail.value.toLowerCase();

        // Combine all results into a single array
        const results = [];

        // Add matching pinned items
        pinnedItems.forEach((item) => {
          if (item.name.toLowerCase().includes(searchVal)) {
            results.push({
              ...item,
              isPinned: true,
            });
          }
        });

        // Add matching history items
        regularItems.forEach((section) => {
          section.chats.forEach((chat) => {
            if (chat.name.toLowerCase().includes(searchVal)) {
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
      },
      [pinnedItems, regularItems],
    );

    const showSearchResults = searchTotalCount > 0 && searchValue;
    const noSearchResults = searchTotalCount === 0 && searchValue;

    return (
      <HistoryShell>
        <HistoryHeader
          headerTitle={args.HeaderTitle}
          showCloseAction={args.showCloseAction}
        />
        <HistoryToolbar
          searchOff={args.searchOff}
          onSearchInput={handleSearchInput}
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
                      name={result.name}
                      date={result.lastUpdated}
                    ></HistorySearchItem>
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
                        name={item.name}
                        selected={item.selected}
                        rename={item.rename}
                        actions={pinnedHistoryItemActions}
                        onMenuAction={handleHistoryItemAction}
                        onSelected={handleSelectChat}
                        onRenameSave={handleRenameSave}
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
                          name={chat.name}
                          selected={chat.selected}
                          rename={chat.rename}
                          actions={historyItemActions}
                          onMenuAction={handleHistoryItemAction}
                          onSelected={handleSelectChat}
                          onRenameSave={handleRenameSave}
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
            onCancel={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
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
        <HistoryHeader headerTitle={args.HeaderTitle} />
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
        <HistoryHeader headerTitle={args.HeaderTitle} />
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
        <HistoryHeader headerTitle={args.HeaderTitle} />
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
        <HistoryHeader headerTitle={args.HeaderTitle} />
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
                    name={item.name}
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
                      name={chat.name}
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

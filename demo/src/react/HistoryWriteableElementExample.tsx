/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./HistoryWriteableElementExample.css";
import {
  HistoryShell,
  HistoryHeader,
  HistoryToolbar,
  HistoryContent,
  HistoryPanel,
  HistoryPanelMenu,
  HistoryPanelItem,
  HistoryPanelItems,
  HistorySearchItem,
  HistoryDeletePanel,
} from "@carbon/ai-chat-components/es/react/history";

import { PinFilled, Search } from "@carbon/icons-react";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Delete16 from "@carbon/icons/es/delete/16.js";
import React, { useState, useCallback } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";

interface HistoryExampleProps {
  instance: ChatInstance;
  parentStateText: string;
  isMobile: boolean;
  loadChat: (event: CustomEvent) => Promise<void>;
}

export interface resultItem {
  id: string;
  name: string;
  lastUpdated: string;
  isPinned: boolean;
  selected?: boolean;
  rename?: boolean;
  messages?: any[];
}

export interface resultItemSection {
  section: string;
  chats: resultItem[];
}

export const historyItemActions = [
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

export const pinnedHistoryItemActions = [
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

export const pinnedHistoryItems: resultItem[] = [
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

export const historyItems: resultItemSection[] = [
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

function HistoryWriteableElementExample({
  loadChat,
  instance,
  parentStateText: _parentStateText,
  isMobile,
}: HistoryExampleProps) {
  const [searchResults, setSearchResults] = useState<resultItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(
    findSelectedItemId(pinnedHistoryItems, historyItems),
  );
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [pinnedItems, setPinnedItems] = useState<resultItem[]>(
    pinnedHistoryItems.map((item) => ({ ...item, rename: false })),
  );
  const [regularItems, setRegularItems] = useState<resultItemSection[]>(
    historyItems.map((section) => ({
      ...section,
      chats: section.chats.map((chat) => ({ ...chat, rename: false })),
    })),
  );

  // Handle select chat
  const handleSelectChat = useCallback(
    (event: CustomEvent) => {
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

        loadChat(event);
      }
    },
    [selectedId, pinnedItems, regularItems, loadChat],
  );

  // Handle pin chat
  const handlePinToTop = useCallback(
    (itemId: string) => {
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

  // Handle unpin chat
  const handleUnpin = useCallback(
    (itemId: string) => {
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

  // Handle delete panel cancel
  const handleDeleteCancel = useCallback(() => {
    setShowDeletePanel(false);
    setItemToDelete(null);
  }, []);

  // Handle delete panel confirm
  const handleDeleteConfirm = useCallback(() => {
    if (itemToDelete) {
      // Remove from pinned items
      setPinnedItems((prev) => prev.filter((item) => item.id !== itemToDelete));

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

  // Handle rename chat save
  const handleRenameSave = useCallback((event: CustomEvent) => {
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

  // Handle chat action event
  const handleHistoryItemAction = useCallback(
    (event: any) => {
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

  // Handle search input event
  const handleSearchInput = useCallback(
    (event: any) => {
      const searchVal = event.detail.value.toLowerCase();

      // Combine all results into a single array
      const results: any[] = [];

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
      setSearchValue(searchVal);
    },
    [pinnedItems, regularItems],
  );

  // Handle new chat
  const handleNewChat = useCallback(() => {
    window.alert("Creating new chat");
    // Create new conversation - you would typically call your API here
    // For demo purposes, we'll just alert it
  }, []);

  /// Handle close history panel
  const handleHistoryClose = useCallback(() => {
    // In float mode, close the history panel
    if (instance?.customPanels) {
      instance.customPanels.getPanel(PanelType.HISTORY)?.close();
    }
  }, [instance]);

  const showSearchResults = searchResults.length > 0 && searchValue;
  const noSearchResults = searchResults.length === 0 && searchValue;

  return (
    <HistoryShell>
      <HistoryHeader
        headerTitle="Conversations"
        onClose={handleHistoryClose}
        showCloseAction={isMobile}
      />
      <HistoryToolbar
        onNewChatClick={handleNewChat}
        onSearchInput={handleSearchInput}
      />
      <HistoryContent>
        {(showSearchResults || noSearchResults) && (
          <div slot="results-count">Results: {searchResults.length}</div>
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
                    onSelected={handleSelectChat}
                  >
                    {result.name}
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
}

export { HistoryWriteableElementExample };

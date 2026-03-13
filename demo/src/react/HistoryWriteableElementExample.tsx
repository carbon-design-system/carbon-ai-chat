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
} from "@carbon/ai-chat-components/es/react/history";

import { PinFilled, Search } from "@carbon/icons-react";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Delete16 from "@carbon/icons/es/delete/16.js";
import React, { useState, useCallback } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";

interface HistoryExampleProps {
  location: string;
  instance: ChatInstance;
  parentStateText: string;
  isMobile: boolean;
}

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

function HistoryWriteableElementExample({
  location: _location,
  instance,
  parentStateText: _parentStateText,
  isMobile,
}: HistoryExampleProps) {
  const [selectedChatId, setSelectedChatId] = useState<string>("today-1");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Handle chat selection
  const handleChatSelected = useCallback((event: any) => {
    const { itemId, itemTitle } = event.detail;
    console.log(`Selected chat: ${itemTitle} (${itemId})`);
    setSelectedChatId(itemId);
    // Here you would typically load the conversation
  }, []);

  // Handle chat actions (rename, delete, pin, etc.)
  const handleChatAction = useCallback((event: any) => {
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
  }, []);

  // Handle search
  const handleSearchInput = useCallback((event: any) => {
    const value = event.detail.value.toLowerCase();
    setSearchValue(value);

    if (value) {
      // Filter all chats
      const results: any[] = [];

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

      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    console.log("Creating new chat");
    // Create new conversation - you would typically call your API here
    // For demo purposes, we'll just log it
  }, []);

  // Handle history close
  const handleHistoryClose = useCallback(() => {
    console.log("History close clicked");
    // In float mode, close the history panel
    if (instance?.customPanels) {
      instance.customPanels.getPanel(PanelType.HISTORY)?.close();
    }
  }, [instance]);

  const historyItemActions = React.useMemo(
    () => [
      { text: "Rename" },
      { text: "Pin" },
      {
        text: "Delete",
        delete: true,
        divider: true,
        icon: iconLoader(Delete16, { slot: "icon" }),
      },
    ],
    [],
  );

  const pinnedHistoryItemActions = React.useMemo(
    () => [
      { text: "Rename" },
      { text: "Unpin" },
      {
        text: "Delete",
        delete: true,
        divider: true,
        icon: iconLoader(Delete16, { slot: "icon" }),
      },
    ],
    [],
  );

  const showSearchResults = searchResults.length > 0 && searchValue;
  const noSearchResults = searchResults.length === 0 && searchValue;

  return (
    <HistoryShell className="history-writeable-element">
      <HistoryHeader
        title="Conversations"
        onHistoryHeaderCloseClick={handleHistoryClose}
        showCloseAction={isMobile}
      />
      <HistoryToolbar
        onChatHistoryNewChatClick={handleNewChat}
        onCdsSearchInput={handleSearchInput}
      />
      <HistoryContent>
        {(showSearchResults || noSearchResults) && (
          <div slot="results-count">Results: {searchResults.length}</div>
        )}
        <HistoryPanel aria-label="Chat history">
          <HistoryPanelItems>
            {/* Search Results */}
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
                    id={result.id}
                    date={result.section || "Pinned"}
                    onHistorySearchItemSelected={handleChatSelected}
                  >
                    {result.title}
                  </HistorySearchItem>
                ))}
              </HistoryPanelMenu>
            )}

            {/* Regular History View */}
            {!showSearchResults && !noSearchResults && (
              <>
                {/* Pinned Chats */}
                <HistoryPanelMenu expanded title="Pinned">
                  <PinFilled slot="title-icon" />
                  {PINNED_CHATS.map((chat) => (
                    <HistoryPanelItem
                      key={chat.id}
                      id={chat.id}
                      title={chat.title}
                      selected={chat.id === selectedChatId}
                      actions={pinnedHistoryItemActions}
                      onHistoryItemSelected={handleChatSelected}
                      onHistoryItemAction={handleChatAction}
                    />
                  ))}
                </HistoryPanelMenu>

                {/* History Sections */}
                {HISTORY_SECTIONS.map((section) => (
                  <HistoryPanelMenu
                    key={section.section}
                    expanded
                    title={section.section}
                  >
                    <Search slot="title-icon" />
                    {section.chats.map((chat) => (
                      <HistoryPanelItem
                        key={chat.id}
                        id={chat.id}
                        title={chat.title}
                        selected={chat.id === selectedChatId}
                        actions={historyItemActions}
                        onHistoryItemSelected={handleChatSelected}
                        onHistoryItemAction={handleChatAction}
                      />
                    ))}
                  </HistoryPanelMenu>
                ))}
              </>
            )}
          </HistoryPanelItems>
        </HistoryPanel>
      </HistoryContent>
    </HistoryShell>
  );
}

export { HistoryWriteableElementExample };

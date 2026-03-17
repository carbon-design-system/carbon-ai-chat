/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export interface resultItem {
  id: string;
  title: string;
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
  },
];

export const pinnedHistoryItems: resultItem[] = [
  {
    id: "pinned-0",
    title:
      "Here's the onboarding doc that includes all the information to get started.",
    lastUpdated: "Feb 10, 6:30 PM",
    isPinned: true,
  },
  {
    id: "pinned-1",
    title: "Let's use this as the master invoice document.",
    selected: true,
    lastUpdated: "Feb 10, 5:45 PM",
    isPinned: true,
  },
  {
    id: "pinned-2",
    title: "Noticed some discrepancies between these two files.",
    lastUpdated: "Feb 10, 4:20 PM",
    isPinned: true,
  },
  {
    id: "pinned-3",
    title: "Do we need a PO number on every documentation here?",
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
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 10, 6:30 PM",
        isPinned: false,
      },
      {
        id: "today-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 10, 5:45 PM",
        isPinned: false,
      },
      {
        id: "today-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 10, 4:20 PM",
        isPinned: false,
      },
      {
        id: "today-3",
        title: "Do we need a PO number on every documentation here?",
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
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 9, 8:15 PM",
        isPinned: false,
      },
      {
        id: "yesterday-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 9, 6:30 PM",
        isPinned: false,
      },
      {
        id: "yesterday-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 9, 4:45 PM",
        isPinned: false,
      },
      {
        id: "yesterday-3",
        title: "Let's troubleshoot this.",
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
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 5, 7:00 PM",
        isPinned: false,
      },
      {
        id: "previous-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 4, 4:30 PM",
        isPinned: false,
      },
      {
        id: "previous-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 4, 2:15 PM",
        isPinned: false,
      },
      {
        id: "previous-3",
        title: "Let's troubleshoot this.",
        lastUpdated: "Feb 3, 11:45 AM",
        isPinned: false,
      },
    ],
  },
];

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Delete16 from "@carbon/icons/es/delete/16.js";

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

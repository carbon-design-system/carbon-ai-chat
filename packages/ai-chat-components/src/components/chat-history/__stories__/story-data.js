/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { action } from "storybook/actions";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Delete16 from "@carbon/icons/es/delete/16.js";
import Time16 from "@carbon/icons/es/time/16.js";

export const historyItemActions = [
  {
    text: "Pin to top",
    onClick: action("onClick"),
  },
  {
    text: "Rename",
    onClick: action("onClick"),
  },
  {
    text: "Delete",
    delete: true,
    divider: true,
    icon: iconLoader(Delete16, { slot: "icon" }),
    onClick: action("onClick"),
  },
];

export const pinnedHistoryItemActions = [
  {
    text: "Unpin",
    onClick: action("onClick"),
  },
  {
    text: "Rename",
    onClick: action("onClick"),
  },
  {
    text: "Delete",
    delete: true,
    divider: true,
    icon: iconLoader(Delete16, { slot: "icon" }),
    onClick: action("onClick"),
  },
];

export const pinnedHistoryItems = [
  {
    id: "pinned-0",
    title:
      "Here's the onboarding doc that includes all the information to get started.",
    lastUpdated: "Feb 10, 6:30 PM",
  },
  {
    id: "pinned-1",
    title: "Let's use this as the master invoice document.",
    selected: true,
    lastUpdated: "Feb 10, 5:45 PM",
  },
  {
    id: "pinned-2",
    title: "Noticed some discrepancies between these two files.",
    lastUpdated: "Feb 10, 4:20 PM",
  },
  {
    id: "pinned-3",
    title: "Do we need a PO number on every documentation here?",
    lastUpdated: "Feb 10, 3:10 PM",
  },
];

export const historyItems = [
  {
    section: "Today",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "today-0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 10, 6:30 PM",
      },
      {
        id: "today-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 10, 5:45 PM",
      },
      {
        id: "today-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 10, 4:20 PM",
      },
      {
        id: "today-3",
        title: "Do we need a PO number on every documentation here?",
        lastUpdated: "Feb 10, 3:10 PM",
      },
    ],
  },
  {
    section: "Yesterday",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "yesterday-0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 9, 8:15 PM",
      },
      {
        id: "yesterday-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 9, 6:30 PM",
      },
      {
        id: "yesterday-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 9, 4:45 PM",
      },
      {
        id: "yesterday-3",
        title: "Let's troubleshoot this.",
        lastUpdated: "Feb 9, 2:20 PM",
      },
    ],
  },
  {
    section: "Previous 7 days",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "previous-0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
        lastUpdated: "Feb 5, 7:00 PM",
      },
      {
        id: "previous-1",
        title: "Let's use this as the master invoice document.",
        lastUpdated: "Feb 4, 4:30 PM",
      },
      {
        id: "previous-2",
        title: "Noticed some discrepancies between these two files.",
        lastUpdated: "Feb 4, 2:15 PM",
      },
      {
        id: "previous-3",
        title: "Let's troubleshoot this.",
        lastUpdated: "Feb 3, 11:45 AM",
      },
    ],
  },
];

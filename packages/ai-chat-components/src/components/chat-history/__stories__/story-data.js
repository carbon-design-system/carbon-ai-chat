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
    id: "0",
    title:
      "Here's the onboarding doc that includes all the information to get started.",
  },
  {
    id: "1",
    title: "Let's use this as the master invoice document.",
    selected: true,
  },
  {
    id: "2",
    title: "Noticed some discrepancies between these two files.",
  },
  {
    id: "3",
    title: "Do we need a PO number on every documentation here?",
  },
];

export const historyItems = [
  {
    section: "Today",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
      },
      {
        id: "1",
        title: "Let's use this as the master invoice document.",
      },
      {
        id: "2",
        title: "Noticed some discrepancies between these two files.",
      },
      {
        id: "3",
        title: "Do we need a PO number on every documentation here?",
      },
    ],
  },
  {
    section: "Yesterday",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
      },
      {
        id: "1",
        title: "Let's use this as the master invoice document.",
      },
      {
        id: "2",
        title: "Noticed some discrepancies between these two files.",
      },
      {
        id: "3",
        title: "Let's troubleshoot this.",
      },
    ],
  },
  {
    section: "Previous 7 days",
    icon: iconLoader(Time16, { slot: "title-icon" }),
    chats: [
      {
        id: "0",
        title:
          "Here's the onboarding doc that includes all the information to get started.",
      },
      {
        id: "1",
        title: "Let's use this as the master invoice document.",
      },
      {
        id: "2",
        title: "Noticed some discrepancies between these two files.",
      },
      {
        id: "3",
        title: "Let's troubleshoot this.",
      },
    ],
  },
];

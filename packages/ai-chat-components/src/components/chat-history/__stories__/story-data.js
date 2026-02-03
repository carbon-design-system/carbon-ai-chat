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

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  ArrowRight16,
  Launch16,
  Version16,
  Download16,
  Share16,
  Maximize16,
  View16,
} from "@carbon/icons";
import { action } from "storybook/actions";

export const cardFooterPresets = {
  "primary danger buttons": [
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
  "ghost button with icon": [
    {
      id: "docs",
      label: "View carbon docs",
      kind: "ghost",
      icon: Launch16,
      payload: { test: "value" },
    },
  ],
  "secondary button": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      icon: Launch16,
      payload: { test: "value" },
    },
  ],
  "3 ghost buttons vertical": [
    {
      id: "docs1",
      label: "View Carbon Docs 1",
      kind: "ghost",
      icon: Launch16,
      payload: { test: "value" },
    },
    {
      id: "docs2",
      label: "View Carbon Docs 2",
      kind: "ghost",
      icon: Launch16,
      payload: { test: "value" },
    },
    {
      id: "docs3",
      label: "View Carbon Docs 3",
      kind: "ghost",
      icon: Launch16,
      payload: { test: "value" },
    },
  ],
  "primary button": [
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "primary button with icon": [
    {
      id: "primary-icon",
      label: "Primary",
      kind: "primary",
      icon: ArrowRight16,
      payload: { test: "value" },
    },
  ],
  "danger button": [
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
  "ghost button": [
    { id: "ghost", label: "Ghost", kind: "ghost", payload: { test: "value" } },
  ],
  "secondary primary buttons": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
};

export const toolbarActions = [
  {
    text: "Version",
    icon: Version16,
    size: "md",
    onClick: action("onClick"),
  },
  {
    text: "Download",
    icon: Download16,
    size: "md",
    onClick: action("onClick"),
  },
  {
    text: "Share",
    icon: Share16,
    size: "md",
    onClick: action("onClick"),
  },
  {
    text: "Maximize",
    icon: Maximize16,
    size: "md",
    onClick: action("onClick"),
  },
];

export const previewCardFooterPresets = {
  "2 ghost icon buttons": [
    {
      id: "ghost 1",
      kind: "ghost",
      tooltipText: "Download",
      icon: Download16,
      payload: { test: "value" },
    },
    {
      id: "ghost 2",
      kind: "ghost",
      tooltipText: "Maximize",
      icon: Maximize16,
      payload: { test: "value" },
    },
  ],
  "1 ghost button with icon": [
    {
      id: "docs",
      label: "View details",
      kind: "ghost",
      icon: Maximize16,
      payload: { test: "value" },
    },
  ],
  "1 ghost button with disabled state": [
    {
      id: "docs",
      label: "View details",
      kind: "ghost",
      icon: Maximize16,
      disabled: true,
    },
  ],
  "1 ghost button with viewing state": [
    {
      id: "docs",
      label: "Viewing",
      kind: "ghost",
      icon: View16,
      isViewing: true,
    },
  ],
  none: undefined,
};

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  Launch16,
  Version16,
  Download16,
  Share16,
  Maximize16,
  Close16,
} from "@carbon/icons";
import { action } from "storybook/actions";

export const workspaceFooterPresets = {
  None: undefined,
  "One button": [
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "A danger button": [
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
  "A ghost button": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
  ],
  "Two buttons": [
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
  "Two buttons with one ghost": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
    {
      id: "primary",
      label: "Primary",
      kind: "primary",
      payload: { test: "value" },
    },
  ],
  "Three buttons": [
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "secondary2",
      label: "Secondary 2",
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
  "Three buttons with one ghost": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
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
  "Three buttons with one danger": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "danger",
      label: "Danger",
      kind: "danger",
      payload: { test: "value" },
    },
  ],
  "Four buttons": [
    {
      id: "tertiary",
      label: "Tertiary",
      kind: "tertiary",
      payload: { test: "value" },
    },
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "secondary2",
      label: "Secondary 2",
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
  "Four buttons with one ghost": [
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
      payload: { test: "value" },
    },
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "secondary2",
      label: "Secondary 2",
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
  "Four buttons with danger ghost": [
    {
      id: "danger-ghost",
      label: "Danger ghost",
      kind: "danger-ghost",
      payload: { test: "value" },
    },
    {
      id: "secondary",
      label: "Secondary",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "secondary2",
      label: "Secondary 2",
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

export const actionLists = {
  "Advanced list": [
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
      text: "Launch",
      icon: Launch16,
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: Maximize16,
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Basic list": [
    {
      text: "Launch",
      icon: Launch16,
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: Maximize16,
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Close only": [
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: action("onClick"),
    },
  ],
  None: [],
};

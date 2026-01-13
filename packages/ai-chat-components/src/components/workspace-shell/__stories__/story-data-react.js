/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { action } from "storybook/actions";
// Using @carbon/icons-react for seamless integration with React Toolbar
import Version from "@carbon/icons-react/es/Version";
import Download from "@carbon/icons-react/es/Download";
import Share from "@carbon/icons-react/es/Share";
import Launch from "@carbon/icons-react/es/Launch";
import Maximize from "@carbon/icons-react/es/Maximize";
import Close from "@carbon/icons-react/es/Close";

export const actionLists = {
  "Advanced list": [
    {
      text: "Version",
      icon: Version,
      onClick: action("onClick"),
    },
    {
      text: "Download",
      icon: Download,
      onClick: action("onClick"),
    },
    {
      text: "Share",
      icon: Share,
      onClick: action("onClick"),
    },
    {
      text: "Launch",
      icon: Launch,
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: Maximize,
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: Close,
      onClick: action("onClick"),
    },
  ],
  "Basic list": [
    {
      text: "Launch",
      icon: Launch,
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: Maximize,
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: Close,
      onClick: action("onClick"),
    },
  ],
  "Close only": [
    {
      text: "Close",
      fixed: true,
      icon: Close,
      onClick: action("onClick"),
    },
  ],
  None: [],
};

export const FooterActionList = {
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
      id: "tertiary",
      label: "Tertiary",
      kind: "tertiary",
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
    {
      id: "ghost",
      label: "Ghost",
      kind: "ghost",
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
};

// Made with Bob

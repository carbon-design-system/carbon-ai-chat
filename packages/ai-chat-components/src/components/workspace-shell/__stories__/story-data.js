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
import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";

export const actionLists = {
  "Advanced list": [
    {
      text: "Version",
      icon: iconLoader(Version16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Download",
      icon: iconLoader(Download16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Share",
      icon: iconLoader(Share16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Basic list": [
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Close only": [
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
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

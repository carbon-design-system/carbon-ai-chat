/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  Version16,
  Download16,
  Share16,
  Launch16,
  Maximize16,
  Close16,
} from "@carbon/icons";
import { action } from "storybook/actions";

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

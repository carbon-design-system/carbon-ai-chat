/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Using @carbon/icons-react for seamless integration with React Toolbar
import Version from "@carbon/icons-react/es/Version";
import Download from "@carbon/icons-react/es/Download";
import Share from "@carbon/icons-react/es/Share";
import Launch from "@carbon/icons-react/es/Launch";
import Maximize from "@carbon/icons-react/es/Maximize";
import Close from "@carbon/icons-react/es/Close";
import { action } from "storybook/actions";

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

// Made with Bob

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAIChatWorkspaceShell from "../components/workspace-shell/src/workspace-shell.js";
import CDSAIChatWorkspaceShellHeader from "../components/workspace-shell/src/workspace-shell-header.js";
import CDSAIChatWorkspaceShellBody from "../components/workspace-shell/src/workspace-shell-body.js";
import CDSAIChatWorkspaceShellFooter from "../components/workspace-shell/src/workspace-shell-footer.js";

import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const WorkspaceShell = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-workspace-shell",
    elementClass: CDSAIChatWorkspaceShell,
    react: React,
  }),
);

const WorkspaceShellHeader = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-workspace-shell-header",
    elementClass: CDSAIChatWorkspaceShellHeader,
    react: React,
  }),
);

const WorkspaceShellBody = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-workspace-shell-body",
    elementClass: CDSAIChatWorkspaceShellBody,
    react: React,
  }),
);

const WorkspaceShellFooter = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-workspace-shell-footer",
    elementClass: CDSAIChatWorkspaceShellFooter,
    react: React,
    events: {
      onFooterClicked: "cds-aichat-workspace-shell-footer-clicked",
    },
  }),
);

export default WorkspaceShell;
export { WorkspaceShellHeader, WorkspaceShellBody, WorkspaceShellFooter };

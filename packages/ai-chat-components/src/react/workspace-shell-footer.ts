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
import CDSAIChatWorkspaceShellFooter from "../components/workspace-shell/src/workspace-shell-footer.js";

const WorkspaceShellFooter = createComponent({
  tagName: "cds-aichat-workspace-shell-footer",
  elementClass: CDSAIChatWorkspaceShellFooter,
  react: React,
  events: {
    onFooterClicked: "cds-aichat-workspace-shell-footer-clicked",
  },
});

export default WorkspaceShellFooter;

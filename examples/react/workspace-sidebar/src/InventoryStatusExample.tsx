/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "./WorkspaceWriteableElementExample.css";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "@carbon/ai-chat-components/es/react/workspace-shell.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";

// Using @carbon/icons-react for all icons
import Close16 from "@carbon/icons-react/es/Close.js";

import React, { useState } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";
import { AILabel, Tag } from "@carbon/react";

interface InventoryStatusExampleProps {
  location: string;
  instance: ChatInstance;
  workspaceId?: string;
  additionalData?: any;
}

function InventoryStatusExample({
  location,
  instance,
  workspaceId,
  additionalData,
}: InventoryStatusExampleProps) {
  const handleClose = () => {
    panel?.close();
  };

  const [toolbarActions, _setToolbarActions] = useState([
    {
      id: "close",
      text: "Close",
      fixed: true,
      icon: Close16,
      onClick: handleClose,
    },
  ]);

  const [footerActions, _setFooterActions] = useState([
    {
      id: "evaluate",
      label: "Evaluate plan",
      kind: "secondary",
      payload: { test: "value" },
    },
    {
      id: "run",
      label: "Run plan",
      kind: "primary",
      payload: { test: "value" },
    },
    {
      id: "cancel",
      label: "Cancel",
      kind: "ghost",
      payload: { test: "value" },
    },
  ]);

  const panel = instance?.customPanels?.getPanel(PanelType.WORKSPACE);

  const handleWorkspaceFooterClick = (event: any) => {
    const { id, kind, label, payload } = event.detail;
    switch (id) {
      case "evaluate":
        alert(
          `Evaluate plan clicked. Kind: ${kind}, Label: ${label}, Payload: ${JSON.stringify(payload)}`,
        );
        break;
      case "run":
        alert(
          `Run plan clicked. Kind: ${kind}, Label: ${label}, Payload: ${JSON.stringify(payload)}`,
        );
        break;
      case "cancel":
        handleClose();
        break;
      default:
        return;
    }
  };

  return (
    <WorkspaceShell>
      <Toolbar slot="toolbar" actions={toolbarActions} overflow>
        <div slot="title" data-fixed>
          Current inventory status
        </div>
        <AILabel size="2xs" autoAlign>
          <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
          <div>
            IBM watsonx is powered by the latest AI models to intelligently
            process conversations and provide help whenever and wherever you may
            need it.
          </div>
        </AILabel>
      </Toolbar>
      <WorkspaceShellHeader
        titleText="Current inventory status"
        subTitleText={`Created on: ${new Date().toLocaleDateString()}`}
      >
        <div slot="header-description">
          This is a simple example workspace component demonstrating the data
          flow from preview card to workspace.
        </div>
        <div slot="header-description">
          <Tag size="sm" type="blue">
            Type: inventory_status
          </Tag>
        </div>
      </WorkspaceShellHeader>
      <WorkspaceShellBody>
        <h3>Hello World!</h3>
        <p>
          This is the <strong>InventoryStatusExample</strong> component,
          rendered when <code>additional_data.type</code> is{" "}
          <code>inventory_status</code>.
        </p>
        <br />
        <h4>Data Flow Demonstration:</h4>
        <p>
          Location: <strong>{location}</strong>
        </p>
        <p>
          Workspace ID: <strong>{workspaceId || "Not provided"}</strong>
        </p>
        <br />
        <h4>Additional Data from Preview Card:</h4>
        <pre>{JSON.stringify(additionalData, null, 2)}</pre>
        <br />
        <p>
          This demonstrates how data flows from the preview cards{" "}
          <code>additional_data</code> field all the way to the workspace
          component, allowing you to pass custom data and configuration to your
          workspace templates.
        </p>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        onFooterClicked={handleWorkspaceFooterClick}
        actions={footerActions}
      ></WorkspaceShellFooter>
    </WorkspaceShell>
  );
}

export { InventoryStatusExample };

// Made with Bob

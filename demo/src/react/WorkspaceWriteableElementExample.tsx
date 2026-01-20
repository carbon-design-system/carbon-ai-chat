/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WorkspaceWriteableElementExample.css"; // Assuming styles are in a separate CSS file
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "@carbon/ai-chat-components/es/react/workspace-shell.js";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar.js";

import Edit16 from "@carbon/icons-react/lib/Edit"; // Keep this React for the Button renderIcon

import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";

import React, { useState } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";
import { AILabel, Button, InlineNotification, Tag } from "@carbon/react";

interface WorkspaceExampleProps {
  location: string;
  instance: ChatInstance;
  parentStateText: string;
}

function WorkspaceWriteableElementExample({
  location,
  instance,
  parentStateText,
}: WorkspaceExampleProps) {
  const handleClose = () => {
    panel?.close();
  };

  const [toolbarActions, _setToolbarActions] = useState([
    {
      id: "version",
      text: "Version",
      icon: Version16,
      size: "md",
      onClick: () => alert("Version clicked"),
    },
    {
      id: "download",
      text: "Download",
      icon: Download16,
      size: "md",
      onClick: () => alert("Download clicked"),
    },
    {
      id: "share",
      text: "Share",
      icon: Share16,
      size: "md",
      onClick: () => alert("Share clicked"),
    },
    {
      id: "launch",
      text: "Launch",
      icon: Launch16,
      size: "md",
      onClick: () => alert("Launch clicked"),
    },
    {
      id: "maximize",
      text: "Maximize",
      icon: Maximize16,
      size: "md",
      onClick: () => alert("Maximize clicked"),
    },
    {
      id: "close",
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
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
          Optimizing excess inventory
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
      <InlineNotification
        title="Notification Title"
        subtitle="Notification Subtitle"
        kind="warning"
        lowContrast={true}
        hideCloseButton
      />
      <WorkspaceShellHeader
        titleText="Optimizing excess inventory plan"
        subTitleText={`Created on: ${new Date().toLocaleDateString()}`}
      >
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
        <div slot="header-description">
          <Tag size="sm" type="gray">
            Phase: Viewing
          </Tag>
        </div>

        <Button kind="tertiary" slot="header-action" renderIcon={Edit16}>
          Edit Plan
        </Button>
      </WorkspaceShellHeader>
      <WorkspaceShellBody>
        Location: {location}. This entire workspace is a writable element with
        external styles applied. You can inject any custom content here. Common
        examples include a text editor, code editor, or a tear sheet with steps.
        The workspace panel takes up the full height of the chat shell.
        <br />
        Here is a property set by the parent application: {parentStateText}
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        onFooterClicked={handleWorkspaceFooterClick}
        actions={footerActions}
      ></WorkspaceShellFooter>
    </WorkspaceShell>
  );
}

export { WorkspaceWriteableElementExample };

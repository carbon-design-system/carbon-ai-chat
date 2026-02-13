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
import Edit16 from "@carbon/icons-react/es/Edit.js";
import Version16 from "@carbon/icons-react/es/Version.js";
import Download16 from "@carbon/icons-react/es/Download.js";
import Share16 from "@carbon/icons-react/es/Share.js";
import Launch16 from "@carbon/icons-react/es/Launch.js";
import Maximize16 from "@carbon/icons-react/es/Maximize.js";
import Close16 from "@carbon/icons-react/es/Close.js";

import React, { useState } from "react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";
import {
  AILabel,
  Button,
  InlineNotification,
  Layer,
  Tag,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";

interface InventoryReportExampleProps {
  location: string;
  instance: ChatInstance;
  parentStateText: string;
  workspaceId?: string;
  additionalData?: any;
}

function InventoryReportExample({
  location,
  instance,
  parentStateText,
  workspaceId,
  additionalData,
}: InventoryReportExampleProps) {
  const handleClose = () => {
    panel?.close();
  };

  const [toolbarActions, _setToolbarActions] = useState([
    {
      id: "version",
      text: "Version",
      icon: Version16,
      onClick: () => alert("Version clicked"),
    },
    {
      id: "download",
      text: "Download",
      icon: Download16,
      onClick: () => alert("Download clicked"),
    },
    {
      id: "share",
      text: "Share",
      icon: Share16,
      onClick: () => alert("Share clicked"),
    },
    {
      id: "launch",
      text: "Launch",
      icon: Launch16,
      onClick: () => alert("Launch clicked"),
    },
    {
      id: "maximize",
      text: "Maximize",
      icon: Maximize16,
      onClick: () => alert("Maximize clicked"),
    },
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

  const tableHeaders = [
    { text: "Name" },
    { text: "Role" },
    { text: "Location" },
    { text: "Status" },
  ];

  const tableRows = [
    {
      cells: [
        { text: "Jordan Smith" },
        { text: "Conversation Designer" },
        { text: "Austin, TX" },
        { text: "Active" },
      ],
    },
    {
      cells: [
        { text: "Priya Patel" },
        { text: "Applied Scientist" },
        { text: "Bengaluru, IN" },
        { text: "Active" },
      ],
    },
    {
      cells: [
        { text: "Lee Chen" },
        { text: "Product Manager" },
        { text: "Singapore" },
        { text: "Paused" },
      ],
    },
    {
      cells: [
        { text: "Morgan Reyes" },
        { text: "Researcher" },
        { text: "Toronto, CA" },
        { text: "Active" },
      ],
    },
    {
      cells: [
        { text: "Samira Khan" },
        { text: "Engineer" },
        { text: "San Jose, CA" },
        { text: "Active" },
      ],
    },
    {
      cells: [
        { text: "Alex Kim" },
        { text: "Designer" },
        { text: "Seoul, KR" },
        { text: "Inactive" },
      ],
    },
  ];

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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [searchValue, setSearchValue] = useState("");

  const filteredRows = tableRows.filter((row) => {
    if (!searchValue) {
      return true;
    }
    const searchLower = searchValue.toLowerCase();
    return row.cells.some((cell) =>
      cell.text.toLowerCase().includes(searchLower),
    );
  });

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
        slot="notification"
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
        <br />
        <br />
        <h4>Data Flow Demonstration:</h4>
        <p>
          Workspace ID: <strong>{workspaceId || "Not provided"}</strong>
        </p>
        <br />
        <h4>Additional Data from Preview Card:</h4>
        <pre>{JSON.stringify(additionalData, null, 2)}</pre>
        <br />
        <div>
          <Layer>
            <Layer>
              <br />
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Curabitur et velit sed erat faucibus blandit non nec felis.
              </p>
              <br />
              <TableContainer
                title="Agent roster"
                description="Operational view of AI chat team members."
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      expanded
                      persistent
                      placeholder="Filter table"
                      onChange={(e) => {
                        if (typeof e !== "string" && e.target) {
                          setSearchValue(e.target.value);
                        }
                      }}
                    />
                    <Button kind="primary">Add new</Button>
                  </TableToolbarContent>
                </TableToolbar>
                <Table size="lg">
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map((header, index) => (
                        <TableHeader key={index}>{header.text}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.cells.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell.text}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Layer>
          </Layer>
          <br />
          <p>
            Fusce egestas sapien id sem luctus, nec hendrerit velit elementum.
            In in justo a nunc accumsan vestibulum. Quisque ut interdum est.
            Proin id felis ac justo blandit dictum. Suspendisse in tellus a
            risus fermentum volutpat vel quis leo. Curabitur varius, libero at
            pulvinar suscipit, urna nisi volutpat felis, sed maximus diam eros
            non metus.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        onFooterClicked={handleWorkspaceFooterClick}
        actions={footerActions}
      ></WorkspaceShellFooter>
    </WorkspaceShell>
  );
}

export { InventoryReportExample };

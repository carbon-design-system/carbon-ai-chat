/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WorkspaceWriteableElementExample.css"; // Assuming styles are in a separate CSS file

import React from "react";
import { Button } from "@carbon/react";
import { ChatInstance, PanelType } from "@carbon/ai-chat";

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
  const panel = instance?.customPanels?.getPanel(PanelType.WORKSPACE);

  const handleClose = () => {
    console.log("handle close of panel", panel);

    panel?.close();
  };

  return (
    <div className="workspace-example-outer-react">
      <div className="workspace-example-inner-react">
        <p>
          Location: {location}. this whole component is rendered through
          workspacePanelElement writeable element. Some content from parent
          state: {parentStateText}
        </p>
        <Button kind="danger" onClick={handleClose}>
          close
        </Button>
      </div>
    </div>
  );
}

export { WorkspaceWriteableElementExample };

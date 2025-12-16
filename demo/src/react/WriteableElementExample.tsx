/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./WriteableElementExample.css"; // Assuming styles are in a separate CSS file

import React from "react";
// import WorkspaceShell, { WorkspaceShellHeader, WorkspaceShellBody, WorkspaceShellFooter } from '@carbon/ai-chat-components/es/react/workspace-shell.js';
// import { Toolbar } from "@carbon/ai-chat-components/es/react/toolbar.js";
// import { InlineNotification } from "@carbon/ai-chat-components/es/react/inline-notification.js";
// import Button from "@carbon/ai-chat-components/es/react/button.js";
// import { Icon } from "@carbon/ai-chat-components/es/react/icon.js";
// import Edit16 from '@carbon/icons/es/edit/16.js';
interface WriteableElementExampleProps {
  location: string;
  parentStateText: string;
}

function WriteableElementExample({
  location,
  parentStateText,
}: WriteableElementExampleProps) {
  return (
    <div className="writeable-element-external">
      {/* <WorkspaceShell>
        <Toolbar
          slot="toolbar"
          actions={toolbarAction}
          overflow={toolbarOverflow}
        >
          <div slot="title" data-fixed>
            {toolbarTitle}
          </div>
          <AILabel
            size="2xs"
            autoalign
            alignment="bottom"
            slot="toolbar-ai-label"
          >
            <div slot="body-text">
              <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
              <div>
                IBM watsonx is powered by the latest AI models to intelligently
                process conversations and provide help whenever and wherever you
                may need it.
              </div>
            </div>
          </AILabel>
        </Toolbar>
        <InlineNotification
          slot="notification"
          title={notificationTitle}
          kind="warning"
          lowContrast={true}
          hideCloseButton
        ></InlineNotification>
        <WorkspaceShellHeader
          titleText={headerTitle}
          subTitleText={headerSubTitle}
        >
          {getHeaderDescription(headerDescription)}
          {showHeaderAction && (
            <Button kind="tertiary" slot="header-action">
              Edit Plan <Icon icon={Edit16} slot="icon" />
            </Button>
          )}
        </WorkspaceShellHeader>
        <WorkspaceShellBody>{getBodyContent(bodyContent)}</WorkspaceShellBody>
        {footerAction !== "noAction" && (
          <WorkspaceShellFooter>
            {getFooterAction(footerAction)}
          </WorkspaceShellFooter>
        )}
      </WorkspaceShell> */}
      <p>
        Location: {location}. This is a writeable element with external styles.
        You can inject any custom content here. You are not constrained by any
        height.
      </p>
      <p>Some content from parent state: {parentStateText}</p>
    </div>
  );
}

export { WriteableElementExample };

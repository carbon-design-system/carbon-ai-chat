/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/button/index.js";
import { PanelType } from "@carbon/ai-chat";
import "@carbon/ai-chat-components/es/components/workspace-shell/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
//icons
import Close16 from "@carbon/icons/es/close/16.js";

@customElement("inventory-status-example")
class InventoryStatusExample extends LitElement {
  static styles = css`
    [slot="workspacePanelElement"] {
      block-size: 100%;
    }

    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      overflow: auto;
      max-height: 200px;
    }
  `;

  @property({ type: String })
  accessor location: string = "";

  @property({ type: Object })
  accessor instance: any = null;

  @property({ type: String })
  accessor workspaceId: string = "";

  @property({ type: Object })
  accessor additionalData: any = null;

  @property({ type: Array })
  accessor toolbarActions: any[] = [
    {
      text: "Close",
      fixed: true,
      icon: Close16,
      size: "md",
      onClick: this.handleClose.bind(this),
    },
  ];

  @property({ type: Array })
  accessor footerActions: any[] = [
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
  ];

  handleClose() {
    const panel = this.instance?.customPanels?.getPanel(PanelType.WORKSPACE);
    panel?.close();
  }

  handleWorkspaceFooterClick(event: any) {
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
        this.handleClose();
        break;
      default:
        return;
    }
  }

  render() {
    return html` <cds-aichat-workspace-shell>
      <cds-aichat-toolbar
        slot="toolbar"
        overflow
        .actions=${this.toolbarActions}
      >
        <div slot="title" data-fixed>Current inventory status</div>
        <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              IBM watsonx is powered by the latest AI models to intelligently
              process conversations and provide help whenever and wherever you
              may need it.
            </p>
          </div>
        </cds-ai-label>
      </cds-aichat-toolbar>
      <cds-aichat-workspace-shell-header
        title-text="Current inventory status"
        subtitle-text=${`Created on: ${new Date().toLocaleDateString()}`}
      >
        <div slot="header-description">
          This is a simple example workspace component demonstrating the data
          flow from preview card to workspace.
        </div>
        <div slot="header-description">
          <cds-tag size="sm" type="blue">Type: inventory_status</cds-tag>
        </div>
      </cds-aichat-workspace-shell-header>
      <cds-aichat-workspace-shell-body>
        <h3>Hello World!</h3>
        <p>
          This is the <strong>InventoryStatusExample</strong> component,
          rendered when <code>additional_data.type</code> is
          <code>"inventory_status"</code>.
        </p>
        <br />
        <h4>Data Flow Demonstration:</h4>
        <p>Location: <strong>${this.location}</strong></p>
        <p>
          Workspace ID:
          <strong>${this.workspaceId || "Not provided"}</strong>
        </p>
        <br />
        <h4>Additional Data from Preview Card:</h4>
        <pre>${JSON.stringify(this.additionalData, null, 2)}</pre>
        <br />
        <p>
          This demonstrates how data flows from the preview card's
          <code>additional_data</code> field all the way to the workspace
          component, allowing you to pass custom data and configuration to your
          workspace templates.
        </p>
      </cds-aichat-workspace-shell-body>

      <cds-aichat-workspace-shell-footer
        .actions=${this.footerActions}
        @cds-aichat-workspace-shell-footer-clicked=${this
          .handleWorkspaceFooterClick}
      >
      </cds-aichat-workspace-shell-footer>
    </cds-aichat-workspace-shell>`;
  }
}

export default InventoryStatusExample;

// Made with Bob

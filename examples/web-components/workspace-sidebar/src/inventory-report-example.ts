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
import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/notification/inline-notification.js";
import "@carbon/web-components/es/components/layer/layer.js";
import "@carbon/web-components/es/components/data-table/table.js";
import "@carbon/web-components/es/components/data-table/table-head.js";
import "@carbon/web-components/es/components/data-table/table-header-row.js";
import "@carbon/web-components/es/components/data-table/table-header-cell.js";
import "@carbon/web-components/es/components/data-table/table-body.js";
import "@carbon/web-components/es/components/data-table/table-row.js";
import "@carbon/web-components/es/components/data-table/table-cell.js";
import "@carbon/web-components/es/components/data-table/table-toolbar.js";
import "@carbon/web-components/es/components/data-table/table-toolbar-content.js";
import "@carbon/web-components/es/components/data-table/table-toolbar-search.js";
import "@carbon/web-components/es/components/data-table/table-header-title.js";
import "@carbon/web-components/es/components/data-table/table-header-description.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
//icons
import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";

@customElement("inventory-report-example")
class InventoryReportExample extends LitElement {
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
  accessor valueFromParent: string = "";

  @property({ type: String })
  accessor workspaceId: string = "";

  @property({ type: Object })
  accessor additionalData: any = null;

  @property({ type: Array })
  accessor toolbarActions: any[] = [
    {
      text: "Version",
      icon: Version16,
      size: "md",
      onClick: () => alert("Version clicked"),
    },
    {
      text: "Download",
      icon: Download16,
      size: "md",
      onClick: () => alert("Download clicked"),
    },
    {
      text: "Share",
      icon: Share16,
      size: "md",
      onClick: () => alert("Share clicked"),
    },
    {
      text: "Launch",
      icon: Launch16,
      size: "md",
      onClick: () => alert("Launch clicked"),
    },
    {
      text: "Maximize",
      icon: Maximize16,
      size: "md",
      onClick: () => alert("Maximize clicked"),
    },
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

    return html` <cds-aichat-workspace-shell>
      <cds-aichat-toolbar
        slot="toolbar"
        overflow
        .actions=${this.toolbarActions}
      >
        <div slot="title" data-fixed>Optimizing excess inventory</div>
        <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
      </cds-aichat-toolbar>
      <cds-inline-notification
        slot="notification"
        title="Notification Title"
        subtitle="Notification Subtitle"
        kind="warning"
        low-contrast=""
        hide-close-button
      >
      </cds-inline-notification>
      <cds-aichat-workspace-shell-header
        title-text="Optimizing excess inventory plan"
        subtitle-text=${`Created on: ${new Date().toLocaleDateString()}`}
      >
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
        <div slot="header-description">
          <cds-tag size="sm" type="gray">Phase: Viewing</cds-tag>
        </div>
        <cds-button kind="tertiary" slot="header-action">
          Edit Plan ${iconLoader(Edit16, { slot: "icon" })}
        </cds-button>
      </cds-aichat-workspace-shell-header>
      <cds-aichat-workspace-shell-body>
        Location: ${this.location}. This entire workspace is a writable element
        with external styles applied. You can inject any custom content here.
        Common examples include a text editor, code editor, or a tear sheet with
        steps. The workspace panel takes up the full height of the chat shell.
        <br />
        Here is a property set by the parent application:
        ${this.valueFromParent}.
        <br />
        <br />
        <h4>Data Flow Demonstration:</h4>
        <p>
          Workspace ID: <strong>${this.workspaceId || "Not provided"}</strong>
        </p>
        <br />
        <h4>Additional Data from Preview Card:</h4>
        <pre>${JSON.stringify(this.additionalData, null, 2)}</pre>
        <br />
        <cds-layer>
          <br />
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            et velit sed erat faucibus blandit non nec felis.
          </p>
          <br />
          <cds-table>
            <cds-table-header-title slot="title"
              >Agent roster</cds-table-header-title
            >
            <cds-table-header-description slot="description">
              Operational view of AI chat team members.
            </cds-table-header-description>
            <cds-table-toolbar slot="toolbar">
              <cds-table-toolbar-content>
                <cds-table-toolbar-search
                  placeholder="Filter table"
                  persistent
                ></cds-table-toolbar-search>
                <cds-button>Add new</cds-button>
              </cds-table-toolbar-content>
            </cds-table-toolbar>
            <cds-table-head>
              <cds-table-header-row>
                ${tableHeaders.map(
                  (header) =>
                    html`<cds-table-header-cell
                      >${header.text}</cds-table-header-cell
                    >`,
                )}
              </cds-table-header-row>
            </cds-table-head>
            <cds-table-body>
              ${tableRows.map(
                (row) => html`
                  <cds-table-row>
                    ${row.cells.map(
                      (cell) =>
                        html`<cds-table-cell>${cell.text}</cds-table-cell>`,
                    )}
                  </cds-table-row>
                `,
              )}
            </cds-table-body>
          </cds-table>
        </cds-layer>
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

export default InventoryReportExample;

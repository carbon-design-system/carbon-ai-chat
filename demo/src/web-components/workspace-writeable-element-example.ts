/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement } from "lit";
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
import "@carbon/web-components/es/components/link/link.js";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
//icons
import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";

@customElement("workspace-writeable-element-example")
class WorkspaceWriteableElementExample extends LitElement {
  @property({ type: String })
  accessor location: string = "";

  @property({ type: Object })
  accessor instance: any = null;

  @property({ type: String })
  accessor valueFromParent: string = "";

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
    const workspaceId =
      this.instance?.getState()?.workspace?.workspaceID || "unknown";

    return html` <cds-aichat-workspace-shell auto-collapsible-header>
      <cds-aichat-toolbar
        slot="toolbar"
        overflow
        .actions=${this.toolbarActions}
        titleText="Optimizing excess inventory"
      >
        <cds-ai-label slot="decorator" alignment="bottom" size="2xs">
          <div
            role="dialog"
            slot="body-text"
            class="cds-aichat-explainability-popover--content"
          >
            <header class="cds-aichat-explainability-popover--content__header">
              <div
                class="cds-aichat-explainability-popover--content__eyebrow-row"
              >
                <span class="cds-aichat-explainability-popover--content__label">
                  AI explained
                </span>
                <cds-tag
                  class="cds-aichat--header__slug-confidence"
                  size="sm"
                  type="outline"
                >
                  Confidence: 89%
                </cds-tag>
              </div>
              <h2 class="cds-aichat-explainability-popover--content__title">
                Name of feature
              </h2>
              <p
                class="cds-aichat-explainability-popover--content__description"
              >
                High level 1-2 sentence description of how the AI is being used
                in the UI.
              </p>
            </header>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>How it works</h3>
                <ol>
                  <li>
                    1. <strong>Key word.</strong> Description of key word.
                  </li>
                  <li>
                    2. <strong>Key word.</strong> Description of key word.
                  </li>
                  <li>
                    3. <strong>Key word.</strong> Description of key word.
                  </li>
                </ol>
              </div>
              <div>
                <h3>Data types used</h3>
                <ul>
                  <li>
                    — <strong>Data type 1.</strong> Explain how it's used.
                  </li>
                  <li>
                    — <strong>Data type 2.</strong> Explain how it's used.
                  </li>
                  <li>
                    — <strong>Data type 3.</strong> Explain how it's used.
                  </li>
                </ul>
              </div>
            </section>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>AI model</h3>
                <cds-link
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span slot="icon">${iconLoader(Launch16)}</span>
                  granite.13b.v2.instruct
                </cds-link>
              </div>
              <div>
                <h4>Additional details</h4>
                <p>
                  Additional information about data used to fine tune and/or
                  train the model
                </p>
              </div>
            </section>
            <section
              class="cds-aichat-explainability-popover--content__section"
            >
              <div>
                <h3>Training data set</h3>
                <cds-link
                  href="https://example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span slot="icon">${iconLoader(Launch16)}</span>
                  IBM Security data piles
                </cds-link>
              </div>
            </section>
          </div>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            <span slot="icon">${iconLoader(Folders16)}</span>
            <span slot="tooltip-content">Folders</span>
          </cds-icon-button>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            <span slot="icon">${iconLoader(FolderOpen16)}</span>
            <span slot="tooltip-content">Open Folder</span>
          </cds-icon-button>
          <cds-icon-button slot="actions" size="lg" kind="ghost">
            <span slot="icon">${iconLoader(View16)}</span>
            <span slot="tooltip-content">View</span>
          </cds-icon-button>
          <cds-ai-label-action-button slot="actions"
            >View details</cds-ai-label-action-button
          >
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
        title-text=${`Optimizing excess inventory plan (ID: ${workspaceId.substring(0, 8)}...)`}
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

export default WorkspaceWriteableElementExample;

/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Workspace-panel content for the table override example. Lit element that
 * renders all rows of the markdown table inside a
 * `<cds-aichat-workspace-shell>` with no pagination — the workspace shell
 * body's `overflow: auto` provides the vertical scrollbar.
 *
 * `main.ts` assigns an instance of this element to
 * `instance.writeableElements.workspacePanelElement` when the user clicks
 * "Open in workspace" on an inline table.
 */

import { type ChatInstance, PanelType } from "@carbon/ai-chat";
import "@carbon/ai-chat-components/es/components/workspace-shell/index.js";
import "@carbon/ai-chat-components/es/components/toolbar/index.js";
import "@carbon/ai-chat-components/es/components/table/index.js";
import type { Action } from "@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js";
import Close16 from "@carbon/icons/es/close/16.js";

import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface WorkspaceTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

@customElement("workspace-table-content")
class WorkspaceTableContent extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
  `;

  // The 2023-05 decorator proposal requires `accessor` for field decorators
  // (the webpack config in this example uses that decorator version).
  @property({ attribute: false })
  accessor data: WorkspaceTableData = { title: "", headers: [], rows: [] };

  @property({ attribute: false })
  accessor instance: ChatInstance | null = null;

  updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!changed.has("data")) {
      return;
    }
    // `cds-aichat-table` exposes `headers` / `rows` / `defaultPageSize` as
    // JS properties. Set them imperatively after the template renders.
    // Setting defaultPageSize to the row count suppresses the pagination
    // bar (the table only renders it when rows.length > currentPageSize).
    const table = this.renderRoot.querySelector(
      "cds-aichat-table",
    ) as unknown as {
      headers: { text: string }[];
      rows: { cells: { text: string }[] }[];
      defaultPageSize: number;
    } | null;
    if (table) {
      table.headers = this.data.headers.map((text) => ({ text }));
      table.rows = this.data.rows.map((cells) => ({
        cells: cells.map((text) => ({ text })),
      }));
      table.defaultPageSize = this.data.rows.length;
    }
  }

  private _close = () => {
    this.instance?.customPanels?.getPanel(PanelType.WORKSPACE).close();
  };

  render() {
    const actions: Action[] = [
      { text: "Close", icon: Close16, onClick: this._close },
    ];
    return html`
      <cds-aichat-workspace-shell>
        <cds-aichat-toolbar slot="toolbar" .actions=${actions}>
          <div slot="title">${this.data.title}</div>
        </cds-aichat-toolbar>
        <cds-aichat-workspace-shell-body>
          <cds-aichat-table></cds-aichat-table>
        </cds-aichat-workspace-shell-body>
      </cds-aichat-workspace-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "workspace-table-content": WorkspaceTableContent;
  }
}

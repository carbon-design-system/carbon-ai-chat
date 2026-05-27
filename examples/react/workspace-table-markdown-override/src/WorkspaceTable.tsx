/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Workspace-panel content for the table override example. Renders all rows
 * of the markdown table inside a `WorkspaceShell` with no pagination — the
 * workspace shell body's `overflow: auto` provides the vertical scrollbar.
 *
 * Used by `App.tsx`: when the user clicks "Open in workspace" on an inline
 * table, App opens the workspace panel and passes the table data to this
 * component via the `renderWriteableElements.workspacePanelElement` slot.
 *
 * Start reading at `WorkspaceTable()`.
 */

import "@carbon/ai-chat-components/es/components/table/index.js";
import { type ChatInstance, PanelType } from "@carbon/ai-chat";
import WorkspaceShell, {
  WorkspaceShellBody,
} from "@carbon/ai-chat-components/es/react/workspace-shell";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar";
import { Close } from "@carbon/icons-react";
import React, { useEffect, useRef } from "react";

import { type TableData } from "./tableData";

interface WorkspaceTableProps {
  instance: ChatInstance;
  data: TableData;
}

function WorkspaceTable({ instance, data }: WorkspaceTableProps) {
  // `cds-aichat-table` exposes `headers` / `rows` / `defaultPageSize` as JS
  // properties (not attributes), so we set them imperatively after mount.
  const tableRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!tableRef.current) {
      return;
    }
    const node = tableRef.current as unknown as {
      headers: { text: string }[];
      rows: { cells: { text: string }[] }[];
      defaultPageSize: number;
    };
    node.headers = data.headers.map((text) => ({ text }));
    node.rows = data.rows.map((cells) => ({
      cells: cells.map((text) => ({ text })),
    }));
    // Setting defaultPageSize to the row count suppresses the pagination
    // bar (the table only renders it when rows.length > currentPageSize).
    node.defaultPageSize = data.rows.length;
  }, [data]);

  const close = () => {
    instance.customPanels?.getPanel(PanelType.WORKSPACE).close();
  };

  return (
    <WorkspaceShell>
      <Toolbar
        slot="toolbar"
        actions={[{ text: "Close", icon: Close, onClick: close }]}
      >
        <div slot="title">{data.title}</div>
      </Toolbar>
      <WorkspaceShellBody>
        {/* @ts-expect-error — cds-aichat-table is a web component, not a React type */}
        <cds-aichat-table ref={tableRef} />
      </WorkspaceShellBody>
    </WorkspaceShell>
  );
}

export { WorkspaceTable };

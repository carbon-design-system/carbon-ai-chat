/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Workspace table markdown override.
 *
 * Demonstrates `markdown.customRenderers.table` combined with the workspace
 * panel API. The override wraps each markdown table in a `cds-aichat-card`
 * whose `cds-aichat-toolbar` header carries a Carbon Maximize icon button.
 * Clicking that button opens the workspace panel and renders the same data
 * as a Carbon DataTable with pagination that adapts to the workspace size.
 *
 * Wiring overview:
 *   - `onBeforeRender` captures the `ChatInstance` into a ref so the
 *     memoized renderer can reach `instance.customPanels` later.
 *   - The renderer closes over the ref and over a `setState` setter; on the
 *     toolbar action's `onClick` it stores the table data in state and
 *     calls `customPanels.getPanel(PanelType.WORKSPACE).open(...)`.
 *   - `renderWriteableElements.workspacePanelElement` returns the
 *     `WorkspaceTable` component whenever the workspace data is set.
 *   - A `BusEventType.WORKSPACE_CLOSE` listener clears the state when the
 *     user closes the panel so the next open can show fresh data.
 *
 * Start reading at `App()` and the table renderer inside the `markdown`
 * `useMemo`.
 */

import {
  type BusEvent,
  BusEventType,
  ChatCustomElement,
  type ChatContainerPropsMarkdown,
  type ChatInstance,
  type MarkdownRendererTableArgs,
  PanelType,
  type PublicConfig,
} from "@carbon/ai-chat";
import Card from "@carbon/ai-chat-components/es/react/card";
import Toolbar from "@carbon/ai-chat-components/es/react/toolbar";
import { Maximize } from "@carbon/icons-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { InlineTablePreview } from "./InlineTablePreview";
import { type TableData } from "./tableData";
import { WorkspaceTable } from "./WorkspaceTable";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
};

function App() {
  // Captured in `onBeforeRender`; the renderer reads it through closure so
  // it doesn't depend on the React tree's re-render schedule.
  const instanceRef = useRef<ChatInstance | null>(null);
  // The data backing the workspace panel; populated on the toolbar action's
  // click, cleared on `WORKSPACE_CLOSE`.
  const [workspaceData, setWorkspaceData] = useState<TableData | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instanceRef.current = instance;
    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: (_event: BusEvent) => {
        setWorkspaceData(null);
      },
    });
  }, []);

  const markdown = useMemo<ChatContainerPropsMarkdown>(
    () => ({
      customRenderers: {
        table: ({ headers, rows, slotName }: MarkdownRendererTableArgs) => {
          const title = "Orders";
          // The toolbar exposes `actions: Action[]` — an array of objects,
          // NOT JSX children — and renders each as a `cds-icon-button` with
          // a tooltip. We supply the Carbon Maximize icon and an onClick
          // that opens the workspace panel.
          const actions = [
            {
              text: "Open in workspace",
              icon: Maximize,
              onClick: () => {
                const data: TableData = {
                  title,
                  headers: headers.map((c) => c.text),
                  rows: rows.map((row) => row.map((c) => c.text)),
                };
                setWorkspaceData(data);
                instanceRef.current?.customPanels
                  ?.getPanel(PanelType.WORKSPACE)
                  .open({
                    title,
                    preferredLocation: "end",
                    workspaceId: slotName,
                  });
              },
            },
          ];
          return (
            <Card isFlush>
              <Toolbar slot="header" titleText={title} actions={actions} />
              <div slot="body">
                <InlineTablePreview
                  headers={headers.map((c) => c.text)}
                  rows={rows.map((row) => row.map((c) => c.text))}
                />
              </div>
            </Card>
          );
        },
      },
    }),
    [],
  );

  // Only built when there is workspace data — `null` means the panel is
  // closed and nothing should render in the writeable-elements slot.
  const renderWriteableElements = useMemo(() => {
    if (!workspaceData || !instanceRef.current) {
      return undefined;
    }
    return {
      workspacePanelElement: (
        <WorkspaceTable instance={instanceRef.current} data={workspaceData} />
      ),
    };
  }, [workspaceData]);

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      onBeforeRender={onBeforeRender}
      renderWriteableElements={renderWriteableElements}
      markdown={markdown}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);

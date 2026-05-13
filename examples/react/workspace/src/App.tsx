/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Workspace panel (React)
 *
 * Demonstrates: the workspace feature for opening rich, side-by-side content
 * (inventory, orders, SQL editor) via the `workspacePanelElement` slot.
 * Subscribes to the `WORKSPACE_*` bus events and uses `customPanels.getPanel`
 * to open the workspace from a `user_defined` response card's "maximize"
 * action.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_CLOSE`
 *   - `instance.customPanels.getPanel(PanelType.WORKSPACE)`
 *   - `renderUserDefinedResponse` for the maximize affordance
 *   - `renderWriteableElements.workspacePanelElement`
 *
 * Start reading at: `App()` and the `onBeforeRender` workspace handlers.
 */

import {
  BusEvent,
  BusEventType,
  BusEventWorkspacePreOpen,
  BusEventWorkspaceOpen,
  BusEventWorkspaceClose,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
  RenderUserDefinedState,
  PanelType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@carbon/styles/css/styles.css";

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";
// Workspace writeable element components
import { InventoryReportExample } from "./InventoryReportExample";
import { InventoryStatusExample } from "./InventoryStatusExample";
import { OutstandingOrdersExample } from "./OutstandingOrdersExample";
import { OutstandingOrdersCard } from "./OutstandingOrdersCard";
import { SqlEditorExample } from "./SqlEditorExample";

/**
 * It is preferable to create your configuration object outside of your React functions. You can also make use of
 * useCallback or useMemo if you need to put it inside.
 *
 * Either way, this will prevent you from spinning up a new config object over and over. Carbon AI Chat will run
 * a diff on the config object and if it is not deeply equal, the chat will be re-started.
 */
const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Hides the chat frame chrome so the workspace and chat sit flush in a fullscreen layout.
    showFrame: false,
    customProperties: {
      // Caps message bubble width so wide screens still feel readable.
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  // Auto-opens chat on load so the workspace flow can be exercised without a launcher click.
  openChatByDefault: true,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [stateText, setStateText] = useState<string>("Initial text");
  const [workspaceData, setWorkspaceData] = useState<{
    type: string | null;
    workspaceId?: string;
    additionalData?: any;
  }>({ type: null });

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);

    // Subscribes to BusEventType.WORKSPACE_PRE_OPEN so hosts can begin loading workspace resources before the panel animates in.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: customWorkspacePreOpenHandler,
    });

    // Subscribes to BusEventType.WORKSPACE_OPEN to capture workspaceId/additionalData and select the writeable element to render.
    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: customWorkspaceOpenHandler,
    });

    // Subscribes to BusEventType.WORKSPACE_CLOSE so workspace state is cleared when the user dismisses the panel.
    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: customWorkspaceCloseHandler,
    });
  }

  // Update state text periodically for demo purposes
  React.useEffect(() => {
    const interval = setInterval(
      () => setStateText(Date.now().toString()),
      2000,
    );
    return () => clearInterval(interval);
  }, []);

  function customWorkspacePreOpenHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspacePreOpen;
    console.log(
      data,
      "This event can be used to load additional resources into the workspace while displaying a manual loading state.",
    );
  }

  function customWorkspaceOpenHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspaceOpen;
    console.log(data, "Workspace panel opened");

    // Extract workspace data from the event
    const { workspaceId, additionalData } = data;
    const type = (additionalData as { type?: string })?.type || null;
    setWorkspaceData({ type, workspaceId, additionalData });
  }

  function customWorkspaceCloseHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspaceClose;
    console.log(data, "Workspace panel closed");

    // Clear workspace data when panel closes
    setWorkspaceData({ type: null });
  }

  const renderUserDefinedResponse = useCallback(
    (state: RenderUserDefinedState, _instance: ChatInstance) => {
      const { messageItem } = state;
      if (messageItem) {
        switch (messageItem.user_defined?.user_defined_type) {
          case "outstanding_orders_card":
            return (
              <OutstandingOrdersCard
                workspaceId={messageItem.user_defined.workspace_id as string}
                onMaximize={() => {
                  const workspaceId = messageItem.user_defined
                    ?.workspace_id as string;
                  const additionalData =
                    messageItem.user_defined?.additional_data;

                  // Seeds workspaceData before opening so the writeable element resolves on the first render after the panel opens.
                  setWorkspaceData({
                    type: (additionalData as { type?: string })?.type || null,
                    workspaceId,
                    additionalData,
                  });

                  // instance.customPanels.getPanel(PanelType.WORKSPACE) hands back the workspace panel API so the host can open it imperatively from a card action.
                  const panel = _instance.customPanels?.getPanel(
                    PanelType.WORKSPACE,
                  );
                  if (panel) {
                    panel.open({
                      workspaceId,
                      additionalData,
                    });
                  }
                }}
              />
            );
          default:
            return undefined;
        }
      }
      return undefined;
    },
    [],
  );

  const renderWriteableElements = useMemo(() => {
    if (!instance || !workspaceData.type) {
      return { workspacePanelElement: null };
    }

    let component;
    switch (workspaceData.type) {
      case "inventory_report":
        component = (
          <InventoryReportExample
            location="workspacePanelElement"
            instance={instance}
            parentStateText={stateText}
            workspaceId={workspaceData.workspaceId}
            additionalData={workspaceData.additionalData}
          />
        );
        break;
      case "inventory_status":
        component = (
          <InventoryStatusExample
            location="workspacePanelElement"
            instance={instance}
            workspaceId={workspaceData.workspaceId}
            additionalData={workspaceData.additionalData}
          />
        );
        break;
      case "outstanding_orders":
        component = (
          <OutstandingOrdersExample
            location="workspacePanelElement"
            instance={instance}
            workspaceId={workspaceData.workspaceId}
            additionalData={workspaceData.additionalData}
          />
        );
        break;
      case "sql_editor":
        component = (
          <SqlEditorExample
            instance={instance}
            workspaceId={workspaceData.workspaceId}
            additionalData={workspaceData.additionalData}
          />
        );
        break;
      default:
        component = null;
    }

    return { workspacePanelElement: component };
  }, [instance, workspaceData, stateText]);

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      // Set the instance into state for usage.
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);

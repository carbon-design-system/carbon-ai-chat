/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./App.css";
import {
  BusEvent,
  BusEventType,
  BusEventWorkspacePreOpen,
  BusEventWorkspaceOpen,
  BusEventWorkspaceClose,
  BusEventViewChange,
  BusEventViewPreChange,
  CarbonTheme,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
  ViewType,
  CornersType,
  RenderUserDefinedState,
  PanelType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@carbon/styles/css/styles.css";
import AiLaunch20 from "@carbon/icons-react/es/AiLaunch.js";

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";
// Workspace writeable element components
import { InventoryReportExample } from "./InventoryReportExample";
import { InventoryStatusExample } from "./InventoryStatusExample";
import { OutstandingOrdersExample } from "./OutstandingOrdersExample";
import { OutstandingOrdersCard } from "./OutstandingOrdersCard";
import { SqlEditorExample } from "./SqlEditorExample";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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
    corners: CornersType.SQUARE,
  },
  openChatByDefault: true,
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [stateText, setStateText] = useState<string>("Initial text");
  const [workspaceData, setWorkspaceData] = useState<{
    type: string | null;
    workspaceId?: string;
    additionalData?: any;
  }>({ type: null });

  // Sidebar state management
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [sideBarClosing, setSideBarClosing] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [workspaceAnimating, setWorkspaceAnimating] = useState<
    "expanding" | "contracting" | null
  >(null);
  const [clickInProgress, setClickInProgress] = useState(false);

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);

    // Handle workspace pre open event
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: customWorkspacePreOpenHandler,
    });

    // Handle workspace open event
    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: customWorkspaceOpenHandler,
    });

    // Handle workspace pre-close event
    instance.on({
      type: BusEventType.WORKSPACE_PRE_CLOSE,
      handler: customWorkspacePreCloseHandler,
    });

    // Handle workspace close event
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

  /**
   * Listens for workspace panel pre open event.
   */
  function customWorkspacePreOpenHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspacePreOpen;
    console.log(
      data,
      "This event can be used to load additional resources into the workspace while displaying a manual loading state.",
    );
    // Expand sidebar when workspace is opening
    console.log("Expanding sidebar - workspace opening");
    setWorkspaceAnimating("expanding");
    setWorkspaceExpanded(true);
  }

  /**
   * Listens for workspace panel open event.
   */
  function customWorkspaceOpenHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspaceOpen;
    console.log(data, "Workspace panel opened");

    // Extract workspace data from the event
    const { workspaceId, additionalData } = data;
    const type = (additionalData as { type?: string })?.type || null;
    setWorkspaceData({ type, workspaceId, additionalData });
  }

  /**
   * Listens for workspace panel pre-close event.
   */
  function customWorkspacePreCloseHandler() {
    // Contract sidebar when workspace is closing
    console.log("Contracting sidebar - workspace closing");
    setWorkspaceAnimating("contracting");
    setWorkspaceExpanded(false);
  }

  /**
   * Listens for workspace panel close event.
   */
  function customWorkspaceCloseHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspaceClose;
    console.log(data, "Workspace panel closed");

    // Clear workspace data when panel closes
    setWorkspaceData({ type: null });
  }

  /**
   * Listens for view changes on the AI chat.
   */
  const onViewChange = (event: BusEventViewChange, _instance: ChatInstance) => {
    if (event.newViewState.mainWindow) {
      setSideBarOpen(true);
    } else {
      setSideBarOpen(false);
      setSideBarClosing(false);
    }
  };

  /**
   * Handles pre-view-change lifecycle for sidebar transitions.
   */
  const onViewPreChange = async (
    event: BusEventViewPreChange,
    _instance: ChatInstance,
  ) => {
    if (!event.newViewState.mainWindow) {
      setSideBarClosing(true);
      await sleep(250);
    }
  };

  // Handle transitionend to remove animation classes
  const handleTransitionEnd = useCallback((event: React.TransitionEvent) => {
    // Only handle width transitions
    if (event.propertyName === "width") {
      setWorkspaceAnimating(null);
    }
  }, []);

  // Handle header button click to toggle chat
  const handleHeaderButtonClick = async () => {
    if (!instance || clickInProgress) {
      return;
    }

    setClickInProgress(true);
    try {
      const state = instance.getState();
      console.log({ viewState: state.viewState });
      if (state.viewState.mainWindow) {
        await instance.changeView(ViewType.LAUNCHER);
      } else {
        await instance.changeView(ViewType.MAIN_WINDOW);
      }
    } finally {
      setClickInProgress(false);
    }
  };

  /**
   * Handler for user_defined response types.
   */
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
                  // Open workspace using the customPanels API
                  const workspaceId = messageItem.user_defined
                    ?.workspace_id as string;
                  const additionalData =
                    messageItem.user_defined?.additional_data;

                  // Set workspace data for rendering
                  setWorkspaceData({
                    type: (additionalData as { type?: string })?.type || null,
                    workspaceId,
                    additionalData,
                  });

                  // Open the workspace panel
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

  // Build className for sidebar layout
  let className = "sidebar";
  if (workspaceExpanded) {
    className += " sidebar--expanded";
  }
  if (workspaceAnimating === "expanding") {
    className += " sidebar--expanding";
  } else if (workspaceAnimating === "contracting") {
    className += " sidebar--contracting";
  }
  if (sideBarClosing) {
    className += " sidebar--closing";
  } else if (!sideBarOpen) {
    className += " sidebar--closed";
  }

  return (
    <>
      <header className="app-header">
        <h1 className="app-header__title">Workspace Sidebar Example</h1>
        {instance && (
          <button
            type="button"
            className="app-header__button"
            onClick={handleHeaderButtonClick}
            disabled={clickInProgress}
            aria-label="Toggle AI Chat"
          >
            <AiLaunch20 />
          </button>
        )}
      </header>
      <div className={className} onTransitionEnd={handleTransitionEnd}>
        <ChatCustomElement
          className="chat-custom-element"
          {...config}
          // Set the instance into state for usage.
          onBeforeRender={onBeforeRender}
          onViewChange={onViewChange}
          onViewPreChange={onViewPreChange}
          renderUserDefinedResponse={renderUserDefinedResponse}
          renderWriteableElements={renderWriteableElements}
        />
      </div>
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);

// Made with Bob

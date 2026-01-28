/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEvent,
  BusEventType,
  BusEventWorkspacePreOpen,
  BusEventWorkspaceOpen,
  CarbonTheme,
  ChatContainer,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@carbon/styles/css/styles.css";

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";
// Workspace writeable element component
import { WorkspaceWriteableElementExample } from "./WorkspaceWriteableElementExample";

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
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [stateText, setStateText] = useState<string>("Initial text");

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
  }

  /**
   * Listens for workspace panel open event.
   */
  function customWorkspaceOpenHandler(event: BusEvent) {
    const { data } = event as BusEventWorkspaceOpen;
    console.log(data, "Workspace panel opened");
  }

  const renderWriteableElements = useMemo(
    () => ({
      workspacePanelElement: instance ? (
        <WorkspaceWriteableElementExample
          location="workspacePanelElement"
          instance={instance}
          parentStateText={stateText}
        />
      ) : null,
    }),
    [instance, stateText],
  );

  return (
    <ChatContainer
      {...config}
      // Set the instance into state for usage.
      onBeforeRender={onBeforeRender}
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);

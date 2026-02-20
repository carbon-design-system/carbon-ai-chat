/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./DemoApp.css";
import "@carbon/styles/css/styles.css";

import {
  BusEvent,
  BusEventMessageItemCustom,
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  BusEventWorkspacePreOpen,
  BusEventWorkspaceOpen,
  ChatContainer,
  ChatCustomElement,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
  RenderUserDefinedState,
  ServiceDesk,
  ServiceDeskFactoryParameters,
} from "@carbon/ai-chat";
import { AISkeletonPlaceholder } from "@carbon/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Settings } from "../framework/types";
import { UserDefinedResponseExample } from "./UserDefinedResponseExample";
import { WriteableElementExample } from "./WriteableElementExample";
import { WorkspaceWriteableElementExample } from "./WorkspaceWriteableElementExample";
import { MockServiceDesk } from "../mockServiceDesk/mockServiceDesk";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const serviceDeskFactory = (parameters: ServiceDeskFactoryParameters) =>
  Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);

interface AppProps {
  config: PublicConfig;
  settings: Settings;
  onChatInstanceReady?: (instance: ChatInstance) => void;
}

function DemoApp({ config, settings, onChatInstanceReady }: AppProps) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [sideBarClosing, setSideBarClosing] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [workspaceAnimating, setWorkspaceAnimating] = useState<
    "expanding" | "contracting" | null
  >(null);
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [stateText, setStateText] = useState<string>("Initial text");
  const isSidebarLayout = settings.layout === "sidebar";

  useEffect(() => {
    setInterval(() => setStateText(Date.now().toString()), 2000);
  }, []);

  /**
   * Handler for user_defined response types. You can just have a switch statement here and return the right component
   * depending on which component should be rendered.
   */
  const renderUserDefinedResponse = useCallback(
    (state: RenderUserDefinedState, _instance: ChatInstance) => {
      const { messageItem, partialItems } = state;
      // The event here will contain details for each user defined response that needs to be rendered.
      if (messageItem) {
        switch (messageItem.user_defined?.user_defined_type) {
          case "green":
            return (
              <UserDefinedResponseExample
                text={messageItem.user_defined.text as string}
                parentStateText={stateText}
              />
            );
          case "response-stopped":
            return <>Custom user_defined response stopped message.</>;
          default:
            return undefined;
        }
      }

      if (partialItems) {
        switch (partialItems[0].user_defined?.user_defined_type) {
          case "green": {
            // The partial members are not concatenated, you get a whole array of chunks so you can special handle
            // concatenation as you want.
            const text = partialItems
              .map((item) => item.user_defined?.text)
              .join("");
            return (
              <UserDefinedResponseExample
                text={text}
                parentStateText={stateText}
              />
            );
          }
          default: {
            // Default to just showing a skeleton state for user_defined responses types we don't want to have special
            // streaming behavior for.
            return <AISkeletonPlaceholder className="fullSkeleton" />;
          }
        }
      }
    },
    [stateText],
  );

  /**
   * You can return a React element for each writeable element.
   */
  const allWriteableElements = useMemo(
    () => ({
      headerBottomElement: (
        <WriteableElementExample
          location="headerBottomElement"
          parentStateText={stateText}
        />
      ),
      welcomeNodeBeforeElement: (
        <WriteableElementExample
          location="welcomeNodeBeforeElement"
          parentStateText={stateText}
        />
      ),
      homeScreenHeaderBottomElement: (
        <WriteableElementExample
          location="homeScreenHeaderBottomElement"
          parentStateText={stateText}
        />
      ),
      homeScreenAfterStartersElement: (
        <WriteableElementExample
          location="homeScreenAfterStartersElement"
          parentStateText={stateText}
        />
      ),
      homeScreenBeforeInputElement: (
        <WriteableElementExample
          location="homeScreenBeforeInputElement"
          parentStateText={stateText}
        />
      ),
      beforeInputElement: (
        <WriteableElementExample
          location="beforeInputElement"
          parentStateText={stateText}
        />
      ),
      afterInputElement: (
        <WriteableElementExample
          location="afterInputElement"
          parentStateText={stateText}
        />
      ),
      footerElement: (
        <WriteableElementExample
          location="footerElement"
          parentStateText={stateText}
        />
      ),
      aiTooltipAfterDescriptionElement: (
        <WriteableElementExample
          location="aiTooltipAfterDescriptionElement"
          parentStateText={stateText}
        />
      ),
      workspacePanelElement: (
        <WorkspaceWriteableElementExample
          location="workspacePanelElement"
          instance={instance as ChatInstance}
          parentStateText={stateText}
        />
      ),
    }),
    [stateText, instance],
  );

  /**
   * Determines which writeable elements to render based on settings and config.
   * - If writeableElements is true: show all elements
   * - If writeableElements is false AND homescreen is custom: show only home screen specific elements
   * - Otherwise: show no elements
   */
  const renderWriteableElements = useMemo(() => {
    const isCustomHomeScreen = config.homescreen?.customContentOnly === true;
    const showAllWriteableElements = settings.writeableElements === "true";
    const showHomeScreenElements =
      !showAllWriteableElements && isCustomHomeScreen;

    let elements;

    if (showAllWriteableElements) {
      elements = allWriteableElements;
    } else if (showHomeScreenElements) {
      elements = {
        homeScreenHeaderBottomElement:
          allWriteableElements.homeScreenHeaderBottomElement,
        homeScreenAfterStartersElement:
          allWriteableElements.homeScreenAfterStartersElement,
      };
    } else {
      elements = {};
    }

    return {
      ...elements,
      workspacePanelElement: allWriteableElements.workspacePanelElement,
    };
  }, [allWriteableElements, settings.writeableElements, config.homescreen]);

  const onBeforeRender = (instance: ChatInstance) => {
    setInstance(instance);
    // Notify parent component that instance is ready
    onChatInstanceReady?.(instance);

    // Here we are registering an event listener for if someone clicks on a button that throws
    // a client side event.
    instance.on({
      type: BusEventType.MESSAGE_ITEM_CUSTOM,
      handler: customButtonHandler,
    });

    // here we add a handler to the workspace pre open and open events
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: (event: BusEvent) => {
        const { data } = event as BusEventWorkspacePreOpen;
        console.log(
          data,
          "This event can be used to load additional resources into the workspace while displaying a manual loading state. in your writeableElement",
        );
        // Expand sidebar when workspace is opening (only in sidebar layout)
        if (isSidebarLayout) {
          console.log("Expanding sidebar - workspace opening");
          setWorkspaceAnimating("expanding");
          setWorkspaceExpanded(true);
        }
      },
    });

    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: customWorkspaceOpenHandler,
    });

    // Listen for workspace pre-close to contract the sidebar
    instance.on({
      type: BusEventType.WORKSPACE_PRE_CLOSE,
      handler: () => {
        // Contract sidebar when workspace is closing (only in sidebar layout)
        if (isSidebarLayout) {
          console.log("Contracting sidebar - workspace closing");
          setWorkspaceAnimating("contracting");
          setWorkspaceExpanded(false);
        }
      },
    });

    // Handle feedback event.
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
  };

  /**
   * Listens for view changes on the AI chat.
   */
  const onViewChange = isSidebarLayout
    ? (event: BusEventViewChange, _instance: ChatInstance) => {
        if (event.newViewState.mainWindow) {
          setSideBarOpen(true);
        } else {
          setSideBarOpen(false);
          setSideBarClosing(false);
        }
      }
    : undefined;

  /**
   * Handles pre-view-change lifecycle for sidebar transitions.
   */
  const onViewPreChange = isSidebarLayout
    ? async (event: BusEventViewPreChange, _instance: ChatInstance) => {
        if (!event.newViewState.mainWindow) {
          setSideBarClosing(true);
          await sleep(250);
        }
      }
    : undefined;

  // Handle transitionend to remove animation classes
  const handleTransitionEnd = useCallback((event: React.TransitionEvent) => {
    // Only handle width transitions
    if (event.propertyName === "width") {
      setWorkspaceAnimating(null);
    }
  }, []);

  // And some logic to add the right classname to our custom element depending on what mode we are in.
  let className = "";
  if (
    settings.layout === "fullscreen" ||
    settings.layout === "fullscreen-no-gutter"
  ) {
    className = "fullScreen";
  } else if (isSidebarLayout) {
    className = "sidebar";
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
  }

  return settings.layout === "float" ? (
    <ChatContainer
      {...config}
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
      renderWriteableElements={renderWriteableElements}
      serviceDeskFactory={serviceDeskFactory}
    />
  ) : (
    <div onTransitionEnd={handleTransitionEnd}>
      <ChatCustomElement
        {...config}
        className={className as string}
        onViewPreChange={onViewPreChange}
        onViewChange={onViewChange}
        onBeforeRender={onBeforeRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
        renderWriteableElements={renderWriteableElements}
        serviceDeskFactory={serviceDeskFactory}
      />
    </div>
  );
}

/**
 * Handles when the user submits feedback.
 */
function feedbackHandler(event: any) {
  if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
    const { ...reportData } = event;
    setTimeout(() => {
      // eslint-disable-next-line no-alert
      window.alert(JSON.stringify(reportData, null, 2));
    });
  }
}

/**
 * Listens for clicks from buttons with custom events attached.
 */
function customButtonHandler(event: BusEvent) {
  const { messageItem } = event as BusEventMessageItemCustom;
  // The 'custom_event_name' property comes from the button response type with button_type of custom_event.
  if (messageItem.custom_event_name === "alert_button") {
    // eslint-disable-next-line no-alert
    window.alert(messageItem.user_defined?.text);
  }
}

/**
 * Listens for workspace panel open event.
 */
function customWorkspaceOpenHandler(event: BusEvent) {
  const { data } = event as BusEventWorkspaceOpen;
  console.log(data, "open handler");
}

export { DemoApp };

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
  ChatContainer,
  ChatCustomElement,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
  RenderUserDefinedState,
  ServiceDesk,
  ServiceDeskFactoryParameters,
  ViewType,
} from "@carbon/ai-chat";
import { AISkeletonPlaceholder } from "@carbon/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Settings } from "../framework/types";
import { SideBar } from "./DemoSideBarNav";
import { UserDefinedResponseExample } from "./UserDefinedResponseExample";
import { WriteableElementExample } from "./WriteableElementExample";
import { MockServiceDesk } from "../mockServiceDesk/mockServiceDesk";

const serviceDeskFactory = (parameters: ServiceDeskFactoryParameters) =>
  Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);

interface AppProps {
  config: PublicConfig;
  settings: Settings;
}

function DemoApp({ config, settings }: AppProps) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [instance, setInstance] = useState<ChatInstance>();
  const [stateText, setStateText] = useState<string>("Initial text");

  useEffect(() => {
    setInterval(() => setStateText(Date.now().toString()), 2000);
  }, []);

  /**
   * Handler for user_defined response types. You can just have a switch statement here and return the right component
   * depending on which component should be rendered.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
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
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-instance-methods#writeableElements
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
      beforeInputElement: (
        <WriteableElementExample
          location="beforeInputElement"
          parentStateText={stateText}
        />
      ),
      aiTooltipAfterDescriptionElement: (
        <WriteableElementExample
          location="aiTooltipAfterDescriptionElement"
          parentStateText={stateText}
        />
      ),
    }),
    [stateText],
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

    if (showAllWriteableElements) {
      return allWriteableElements;
    } else if (showHomeScreenElements) {
      return {
        homeScreenHeaderBottomElement:
          allWriteableElements.homeScreenHeaderBottomElement,
        homeScreenAfterStartersElement:
          allWriteableElements.homeScreenAfterStartersElement,
      };
    } else {
      return undefined;
    }
  }, [allWriteableElements, settings.writeableElements, config.homescreen]);

  const onBeforeRender = (instance: ChatInstance) => {
    // You can set the instance to access it later if you need to.
    setInstance(instance);

    // Here we are registering an event listener for if someone clicks on a button that throws
    // a client side event.
    instance.on({
      type: BusEventType.MESSAGE_ITEM_CUSTOM,
      handler: customButtonHandler,
    });

    // Handle feedback event.
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
  };

  /**
   * Closes/hides the chat.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-instance-methods#changeView.
   */
  const openSideBar = () => {
    instance?.changeView(ViewType.MAIN_WINDOW);
  };

  /**
   * Listens for view changes on the AI chat.
   *
   * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-events#view:change
   */
  const onViewChange =
    settings.layout === "sidebar"
      ? (event: BusEventViewChange, _instance: ChatInstance) => {
          setSideBarOpen(event.newViewState.mainWindow);
        }
      : undefined;

  // And some logic to add the right classname to our custom element depending on what mode we are in.
  let className = "";
  if (
    settings.layout === "fullscreen" ||
    settings.layout === "fullscreen-no-gutter"
  ) {
    className = "fullScreen";
  } else if (settings.layout === "sidebar") {
    if (sideBarOpen) {
      className = "sidebar";
    } else {
      className = "sidebar sidebar--closed";
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
    <>
      <ChatCustomElement
        {...config}
        className={className}
        onViewChange={onViewChange}
        onBeforeRender={onBeforeRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
        renderWriteableElements={renderWriteableElements}
        serviceDeskFactory={serviceDeskFactory}
      />
      {settings.layout === "sidebar" && !sideBarOpen && (
        <SideBar openSideBar={openSideBar} />
      )}
    </>
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
 *
 * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-events#messageItemCustom
 */
function customButtonHandler(event: BusEvent) {
  const { messageItem } = event as BusEventMessageItemCustom;
  // The 'custom_event_name' property comes from the button response type with button_type of custom_event.
  if (messageItem.custom_event_name === "alert_button") {
    // eslint-disable-next-line no-alert
    window.alert(messageItem.user_defined?.text);
  }
}

export { DemoApp };

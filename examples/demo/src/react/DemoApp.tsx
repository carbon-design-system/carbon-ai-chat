/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import "./DemoApp.css";
import "@carbon/styles/css/styles.css";

import {
  BusEventFeedback,
  BusEventType,
  BusEventViewChange,
  ChatContainer,
  ChatCustomElement,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
  RenderUserDefinedState,
  ViewType,
} from "@carbon/ai-chat";
import { AISkeletonPlaceholder } from "@carbon/react";
import React, { useState } from "react";

import { Settings } from "../framework/types";
import { SideBar } from "./DemoSideBarNav";
import { Chart } from "./UserDefinedChart";
import { UserDefinedResponseExample } from "./UserDefinedResponseExample";
import { WriteableElementExample } from "./WriteableElementExample";

interface AppProps {
  config: PublicConfig;
  settings: Settings;
}

function DemoApp({ config, settings }: AppProps) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [instance, setInstance] = useState<ChatInstance>();

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

    switch (settings.homescreen) {
      case "default":
        instance.updateHomeScreenConfig({
          is_on: true,
          greeting: "Hello!\n\nThis is some text to introduce your chat.",
          starters: {
            is_on: true,
            buttons: [
              {
                label: "text",
              },
              {
                label: "text (stream)",
              },
              {
                label: "code",
              },
              {
                label: "code (stream)",
              },
            ],
          },
        });
        break;

      case "custom":
        instance.updateHomeScreenConfig({
          is_on: true,
          custom_content_only: true,
        });
        break;

      default:
        break;
    }
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
      ? (event: BusEventViewChange, instance: ChatInstance) => {
          setSideBarOpen(event.newViewState.mainWindow);
        }
      : undefined;

  // And some logic to add the right classname to our custom element depending on what mode we are in.
  let className;
  if (settings.layout === "fullscreen") {
    className = "fullScreen";
  } else if (settings.layout === "sidebar") {
    if (sideBarOpen) {
      className = "sidebar";
    } else {
      className = "sidebar sidebar--closed";
    }
  }

  return (
    <>
      {settings.layout === "float" ? (
        <ChatContainer
          config={config}
          onBeforeRender={onBeforeRender}
          renderUserDefinedResponse={renderUserDefinedResponse}
          renderWriteableElements={
            settings.writeableElements === "true"
              ? renderWriteableElements
              : undefined
          }
        />
      ) : (
        <>
          <ChatCustomElement
            config={config}
            className={className}
            onViewChange={onViewChange}
            onBeforeRender={onBeforeRender}
            renderUserDefinedResponse={renderUserDefinedResponse}
            renderWriteableElements={
              settings.writeableElements === "true"
                ? renderWriteableElements
                : undefined
            }
          />
          {settings.layout === "sidebar" && !sideBarOpen && (
            <SideBar openSideBar={openSideBar} />
          )}
        </>
      )}
    </>
  );
}

/**
 * You can return a React element for each writeable element.
 *
 * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-instance-methods#writeableElements
 */
const renderWriteableElements = {
  headerBottomElement: () => (
    <WriteableElementExample location="headerBottomElement" />
  ),
  welcomeNodeBeforeElement: () => (
    <WriteableElementExample location="welcomeNodeBeforeElement" />
  ),
  homeScreenHeaderBottomElement: () => (
    <WriteableElementExample location="homeScreenHeaderBottomElement" />
  ),
  homeScreenAfterStartersElement: () => (
    <WriteableElementExample location="homeScreenAfterStartersElement" />
  ),
  beforeInputElement: () => (
    <WriteableElementExample location="beforeInputElement" />
  ),
  aiTooltipAfterDescriptionElement: () => (
    <WriteableElementExample location="aiTooltipAfterDescriptionElement" />
  ),
};

/**
 * Handles when the user submits feedback.
 */
function feedbackHandler(event: any) {
  if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
    const { message, messageItem, ...reportData } = event;
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
function customButtonHandler(event: any) {
  const { customEventType, messageItem } = event;
  // The 'custom_event_name' property comes from the button response type with button_type of custom_event.
  if (
    customEventType === "buttonItemClicked" &&
    messageItem.custom_event_name === "alert_button"
  ) {
    // eslint-disable-next-line no-alert
    window.alert(messageItem.user_defined.text);
  }
}

/**
 * Handler for user_defined response types. You can just have a switch statement here and return the right component
 * depending on which component should be rendered.
 *
 * @see https://web-chat.global.assistant.watson.cloud.ibm.com/carbon-chat.html?to=api-render#user-defined-responses
 */
function renderUserDefinedResponse(
  state: RenderUserDefinedState,
  instance: ChatInstance
) {
  const { messageItem } = state;
  // The event here will contain details for each user defined response that needs to be rendered.
  if (messageItem) {
    switch (messageItem.user_defined?.user_defined_type) {
      case "chart":
        return (
          <div className="padding">
            <Chart content={messageItem.user_defined.chart_data as string} />
          </div>
        );
      case "green":
        return (
          <UserDefinedResponseExample
            text={messageItem.user_defined.text as string}
          />
        );
      case "response-stopped":
        return <>Custom user_defined response stopped message.</>;
      default:
        return undefined;
    }
  }
  // We are just going to show a skeleton state here if we are waiting for a stream, but you can instead have another
  // switch statement here that does something more specific depending on the component.
  return <AISkeletonPlaceholder className="fullSkeleton" />;
}

export { DemoApp };

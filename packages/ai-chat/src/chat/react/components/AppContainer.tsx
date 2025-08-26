/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component actually loads the Chat class and renders the Chat.
 *
 * It handles writing Portals for user_defined response types as well and teardown and build activities.
 */

import isEqual from "lodash-es/isEqual.js";
import React, {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

import Chat from "../../shared/Chat";
import { instantiateWidget } from "../../shared/chatEntryFunctions";
import {
  RenderFunctionArgs,
  RenderFunctionType,
} from "../../shared/ChatInterface";
import App from "../../shared/containers/App";
import { sleep } from "../../shared/utils/lang/promiseUtils";
import { UserDefinedResponsePortalsContainer } from "./UserDefinedResponsePortalsContainer";
import { WriteableElementsPortalsContainer } from "./WriteableElementsPortalsContainer";
import { ChatContainerProps } from "../../../types/component/ChatContainer";
import { ChatInstance } from "../../../types/instance/ChatInstance";
import {
  ManagedWebChat,
  RenderUserDefinedStateInternal,
} from "../../../types/component/ManagedWebChat";
import { PublicConfig } from "../../../types/config/PublicConfig";
import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
} from "../../../types/events/eventBusTypes";

/**
 * This component is the entry point to the action React chat application used by both the React and web component exports.
 *
 * Is it responsible for kicking off the Chat class and re-booting it if the passed config changes.
 */

interface AppContainerProps extends ChatContainerProps {
  /**
   * The element the Carbon AI Chat is hosted in. Including main window and launcher.
   */
  container: HTMLElement;

  /**
   * The optional custom element the container is mounted to.
   */
  element?: HTMLElement;

  /**
   * This is used by the React ChatContainer. ChatContainer has to inject the DOM element that is used as the container
   * into the ShadowRoot. When Carbon AI Chat is destroyed, this element is removed. By seeing that the instance has been set
   * to null, ChatContainer can know it needs to re-create that element in a useEffect.
   */
  setParentInstance?: React.Dispatch<React.SetStateAction<ChatInstance>>;
}

function AppContainer({
  config,
  onBeforeRender,
  onAfterRender,
  renderUserDefinedResponse,
  renderWriteableElements,
  container,
  setParentInstance,
  element,
}: AppContainerProps) {
  // A state value that contains the current instance of Carbon AI Chat.
  const [instance, setInstance] = useState<ChatInstance>(null);
  const [renderProps, setRenderProps] = useState<RenderFunctionArgs>(null);
  const [applicationStyles, setApplicationStyles] = useState<string>(null);

  /**
   * In the ChatContainer React application, we need to know if instance has been nulled out because the chat
   * was destroyed to be able to re-create the container element that was destroyed.
   */
  const setInstances = (instance: ChatInstance) => {
    setInstance(instance);
    setParentInstance?.(instance);
  };

  // This state will be used to record all the user defined response events that are fired from the widget. These
  // events contain the HTML elements that we will attach our portals to as well as the messages that we wish to
  // render in the message.
  const [userDefinedResponseEventsBySlot, setUserDefinedResponseEventsBySlot] =
    useState<Record<string, RenderUserDefinedStateInternal>>({});

  // The most recent Carbon AI Chat that was load by this component.
  const managedWebChatRef = useRef<ManagedWebChat>(null);

  // The previous Carbon AI Chat config.
  const previousConfigRef = useRef<PublicConfig>(null);

  useEffect(() => {
    const previousConfig = previousConfigRef.current;
    previousConfigRef.current = config;

    async function render({ serviceManager }: RenderFunctionArgs) {
      // For the npm package, we currently assume Carbon fonts are loaded on the page already.
      // This might have to change if we allow white labeling some day.
      const applicationStyles = await loadStyles();
      serviceManager.container = container;

      if (serviceManager.customHostElement) {
        // Set container to grow to size of provided element. We don't do this sooner because "body" might be set to
        // display: flex;
        container.style.setProperty("width", "100%", "important");
        container.style.setProperty("height", "100%", "important");
      } else {
        // We want to make sure it doesn't interfere with the body by covering anything up so we'll set it to a 0 size.
        // The child elements use position: fixed along with a size that break out of the container.
        container.style.setProperty("width", "0", "important");
        container.style.setProperty("height", "0", "important");
      }

      // Make sure that the renderProps are set before we resolve the render function to make sure the component is
      // actually rendered on time.

      setApplicationStyles(applicationStyles);
      setRenderProps({
        serviceManager,
      });
      await sleep(0);
    }

    // isEqual performs a deep check, but for elements only checks the reference.
    if (!isEqual(previousConfig, config)) {
      // We'll use this managed object to keep track of the Carbon AI Chat instance we are creating for this effect.
      const managedWebChat: ManagedWebChat = {
        instance: null,
        shouldDestroy: false,
        config,
      };

      if (config) {
        loadChat({
          managedWebChatRef,
          managedWebChat,
          render,
          setInstance: setInstances,
          onBeforeRender,
          onAfterRender,
          setUserDefinedResponseEventsBySlot,
          element,
        });
      }

      return () => {
        destroyWebChat(managedWebChat, setInstances);
        previousConfigRef.current = null;
      };
    }

    return undefined;
    // We purposely exclude onBeforeRender and onAfterRender here to prevent unneeded tear downs.
    // We will only actually re-render if the config changes, so those two functions changing doesn't bother us.
    // If there is a new config, we will pick up the new onBeforeRender and onAfterRender anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, container]);

  if (renderProps && instance) {
    return (
      <>
        <App
          serviceManager={renderProps.serviceManager}
          hostElement={renderProps.serviceManager.customHostElement}
          applicationStyles={applicationStyles}
        />

        {renderUserDefinedResponse && (
          <UserDefinedResponsePortalsContainer
            chatInstance={instance}
            renderUserDefinedResponse={renderUserDefinedResponse}
            userDefinedResponseEventsBySlot={userDefinedResponseEventsBySlot}
          />
        )}

        {renderWriteableElements && (
          <WriteableElementsPortalsContainer
            chatInstance={instance}
            renderResponseMap={renderWriteableElements}
          />
        )}
      </>
    );
  }

  return null;
}

interface LoadChatArgs {
  managedWebChatRef: MutableRefObject<ManagedWebChat>;
  managedWebChat: ManagedWebChat;
  render: RenderFunctionType;
  setInstance: (instance: ChatInstance) => void;
  /**
   * This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onBeforeRender?: (instance: ChatInstance) => Promise<void> | void;

  /**
   * This function is called after the render function of Carbon AI Chat is called. This function can return a Promise
   * which will cause Carbon AI Chat to wait for it before rendering.
   */
  onAfterRender?: (instance: ChatInstance) => Promise<void> | void;

  setUserDefinedResponseEventsBySlot: Dispatch<
    SetStateAction<{
      [key: string]: RenderUserDefinedStateInternal;
    }>
  >;

  /**
   * Custom element to render the chat into.
   */
  element?: HTMLElement;
}

/**
 * Destroys an instance of Carbon AI Chat and marks it destroyed.
 */
async function destroyWebChat(
  managedWebChat: ManagedWebChat,
  setInstance: (instance: ChatInstance) => void,
) {
  if (managedWebChat) {
    if (managedWebChat.instance) {
      managedWebChat.instance.destroy();
      await sleep(0);
    }
    managedWebChat.shouldDestroy = true;
    managedWebChat.instance = null;
  }

  // Some cloak and daggers because setInstance isn't an async function and we want to make sure that in the case of
  // the React Chat Container that the clearing of the instance has been registered and a new container element
  // created to be used.
  setInstance(null);
  await sleep(0);
}

/**
 * Adds a "userDefinedResponse" event listener to the given Carbon AI Chat instance that will use the given set function
 * to add new events to the list.
 */
function addUserDefinedResponseHandler(
  webChatInstance: ChatInstance,
  setUserDefinedResponseEventsBySlot: Dispatch<
    SetStateAction<{
      [key: string]: RenderUserDefinedStateInternal;
    }>
  >,
) {
  /**
   * This handler will fire each time a user defined response occurs and we will update our state by appending the
   * event to the end of our events list. We have to make sure to create a new array in order to trigger a re-render.
   */
  function userDefinedResponseHandler(event: BusEventUserDefinedResponse) {
    setUserDefinedResponseEventsBySlot((userDefinedEventsBySlot) => {
      return {
        ...userDefinedEventsBySlot,
        [event.data.slot]: {
          fullMessage: event.data.fullMessage,
          messageItem: event.data.message,
          element: event.data.element,
        },
      };
    });
  }

  /**
   * This handler will fire each time a user defined response occurs and we will update our state by appending the event to the end of our events list.
   * We have to make sure to create a new array in order to trigger a re-render.
   * We use a map here to make sure there is only one event per slot name (taking the latest).
   */
  function userDefinedChunkHandler(event: BusEventChunkUserDefinedResponse) {
    if ("complete_item" in event.data.chunk) {
      const messageItem = event.data.chunk.complete_item;
      setUserDefinedResponseEventsBySlot((userDefinedEventsBySlot) => {
        return {
          ...userDefinedEventsBySlot,
          [event.data.slot]: {
            messageItem,
            element: event.data.element,
            // We blow away partial items here so we don't have to track them forever for no reason.
          },
        };
      });
    } else if ("partial_item" in event.data.chunk) {
      const itemChunk = event.data.chunk.partial_item;
      setUserDefinedResponseEventsBySlot((userDefinedEventsBySlot) => {
        return {
          ...userDefinedEventsBySlot,
          [event.data.slot]: {
            partialItems: [
              ...(userDefinedEventsBySlot[event.data.slot]?.partialItems || []),
              itemChunk,
            ],
            element: event.data.element,
          },
        };
      });
    }
  }

  // Also make sure to clear the list if a restart occurs.
  function restartHandler() {
    setUserDefinedResponseEventsBySlot({});
  }

  webChatInstance.on({
    type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
    handler: userDefinedChunkHandler,
  });
  webChatInstance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: userDefinedResponseHandler,
  });
  webChatInstance.on({
    type: BusEventType.RESTART_CONVERSATION,
    handler: restartHandler,
  });
}

async function loadChat({
  managedWebChatRef,
  managedWebChat,
  render,
  setInstance,
  onBeforeRender,
  onAfterRender,
  setUserDefinedResponseEventsBySlot,
  element,
}: LoadChatArgs) {
  // Each time the Carbon AI Chat config settings change (or this component is mounted), we need to destroy any previous
  // Carbon AI Chat and create a new Carbon AI Chat.

  // First look at the old ref and destroy it if its supposed to be destroyed.
  await destroyWebChat(managedWebChatRef.current, setInstance);

  // Update the ref to the new managedWebChat.
  managedWebChatRef.current = managedWebChat;

  // Just double check that the new one also isn't supposed to be destroyed.
  if (managedWebChat.shouldDestroy) {
    await destroyWebChat(managedWebChat, setInstance);
    return;
  }

  // Create Carbon AI Chat here.
  const widget = await instantiateWidget(
    managedWebChat.config,
    () => Promise.resolve(Chat),
    Promise.resolve(render),
    element,
  );

  const instance = await widget.start();

  addUserDefinedResponseHandler(instance, setUserDefinedResponseEventsBySlot);

  onBeforeRender?.(instance);
  await instance.render();
  onAfterRender?.(instance);

  setInstance(instance);
  managedWebChat.instance = instance;

  if (managedWebChat.shouldDestroy) {
    await destroyWebChat(managedWebChat, setInstance);
  }
}

const AppContainerExport = React.memo(AppContainer);

const loadBaseStyles = async () => {
  const { default: styles } = await import("../../shared/styles/export.scss");
  return styles;
};

async function loadStyles() {
  const styles = await loadBaseStyles();
  return styles;
}

export { AppContainerExport as AppContainer };

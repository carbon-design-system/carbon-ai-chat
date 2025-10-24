/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

import { ChatInstance } from "../../../../types/instance/ChatInstance";
import {
  RenderUserDefinedResponse,
  RenderUserDefinedState,
} from "../../../../types/component/ChatContainer";

interface UserDefinedResponsePortalsContainer {
  /**
   * The instance of a Carbon AI Chat that this component will register listeners on.
   */
  chatInstance: ChatInstance;

  /**
   * The function that this component will use to request the actual React content to display for each user defined
   * response.
   */
  renderUserDefinedResponse?: RenderUserDefinedResponse;

  /**
   * The list of events gathered by slot name that were fired that contain all the responses to render.
   */
  userDefinedResponseEventsBySlot: {
    [key: string]: RenderUserDefinedState;
  };

  /**
   * The chat wrapper element where slot elements should be appended
   */
  chatWrapper?: HTMLElement;
}

/**
 * This is a utility component that is used to manage all the user defined responses that are rendered by Carbon AI Chat.
 * When a user defined response message is received by Carbon AI Chat, it will fire a "userDefinedResponse" event that
 * provides an HTML element to which your application can attach user defined content. React portals are a mechanism
 * that allows you to render a component in your React application but attach that component to the HTML element
 * that was provided by Carbon AI Chat.
 *
 * This component will render a portal for each user defined response. The contents of that portal will be
 * determined by calling the provided "renderResponse" render prop.
 */
function UserDefinedResponsePortalsContainer({
  chatInstance,
  renderUserDefinedResponse,
  userDefinedResponseEventsBySlot,
  chatWrapper,
}: UserDefinedResponsePortalsContainer) {
  const slotElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Wait for chatWrapper to exist and be defined
  const waitForChatWrapper = async (
    wrapper: HTMLElement | null,
    timeout = 150,
  ) => {
    const start = performance.now();
    while (!wrapper && performance.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return wrapper;
  };

  useEffect(() => {
    if (!chatWrapper) {
      return;
    }

    // Wait for chatWrapper to be ready and then ensure all slot elements are appended
    (async () => {
      const wrapper = await waitForChatWrapper(chatWrapper);
      if (!wrapper) {
        console.warn("chatWrapper not found within timeout");
        return;
      }

      // Append any slot elements that aren't already in the DOM
      for (const el of slotElementsRef.current.values()) {
        if (!wrapper.contains(el)) {
          wrapper.appendChild(el);
        }
      }
    })();
  }, [chatWrapper]);

  const getOrCreateSlotElement = (slot: string): HTMLElement => {
    let hostElement = slotElementsRef.current.get(slot);

    if (!hostElement) {
      hostElement = document.createElement("div");
      hostElement.setAttribute("slot", slot);
      slotElementsRef.current.set(slot, hostElement);

      // If chatWrapper is already mounted, append immediately
      if (chatWrapper) {
        chatWrapper.appendChild(hostElement);
      }
    }

    return hostElement;
  };

  // All we need to do to enable the React portals is to render each portal somewhere in your application (it
  // doesn't really matter where).
  return renderUserDefinedResponse
    ? Object.entries(userDefinedResponseEventsBySlot).map(
        ([slot, slotState]) => {
          const hostElement = getOrCreateSlotElement(slot);

          return (
            <UserDefinedResponseComponentPortal
              key={slot}
              hostElement={hostElement}
            >
              {renderUserDefinedResponse(slotState, chatInstance)}
            </UserDefinedResponseComponentPortal>
          );
        },
      )
    : null;
}

/**
 * This is the component that will attach a React portal to the given host element. The host element is the element
 * provided by Carbon AI Chat where your user defined response will be displayed in the DOM. This portal will attach any React
 * children passed to it under this component so you can render the response using your own React application. Those
 * children will be rendered under the given element where it lives in the DOM.
 */
function UserDefinedResponseComponentPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode;
}) {
  return ReactDOM.createPortal(children, hostElement);
}

const UserDefinedResponsePortalsContainerExport = React.memo(
  UserDefinedResponsePortalsContainer,
);
export { UserDefinedResponsePortalsContainerExport as UserDefinedResponsePortalsContainer };

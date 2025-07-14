/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode } from "react";
import ReactDOM from "react-dom";

import { ChatInstance } from "../../../types/instance/ChatInstance";
import { RenderUserDefinedResponse } from "../../../types/component/ChatContainer";
import { RenderUserDefinedStateInternal } from "../../../types/component/ManagedWebChat";

interface UserDefinedResponsePortalsContainer {
  /**
   * The instance of a Carbon AI chat that this component will register listeners on.
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
    [key: string]: RenderUserDefinedStateInternal;
  };
}

/**
 * This is a utility component that is used to manage all the user defined responses that are rendered by Carbon AI chat.
 * When a user defined response message is received by Carbon AI chat, it will fire a "userDefinedResponse" event that
 * provides an HTML element to which your application can attach user defined content. React portals are a mechanism
 * that allows you to render a component in your React application but attach that component to the HTML element
 * that was provided by Carbon AI chat.
 *
 * This component will render a portal for each user defined response. The contents of that portal will be
 * determined by calling the provided "renderResponse" render prop.
 */
function UserDefinedResponsePortalsContainer({
  chatInstance,
  renderUserDefinedResponse,
  userDefinedResponseEventsBySlot,
}: UserDefinedResponsePortalsContainer) {
  // All we need to do to enable the React portals is to render each portal somewhere in your application (it
  // doesn't really matter where).
  return renderUserDefinedResponse
    ? Object.entries(userDefinedResponseEventsBySlot).map(
        ([slot, slotState]) => {
          const { element } = slotState;
          if (!element) {
            return null;
          }
          return (
            <UserDefinedResponseComponentPortal
              key={slot}
              hostElement={element}
            >
              {renderUserDefinedResponse(slotState, chatInstance)}
            </UserDefinedResponseComponentPortal>
          );
        }
      )
    : null;
}

/**
 * This is the component that will attach a React portal to the given host element. The host element is the element
 * provided by Carbon AI chat where your user defined response will be displayed in the DOM. This portal will attach any React
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
  UserDefinedResponsePortalsContainer
);
export { UserDefinedResponsePortalsContainerExport as UserDefinedResponsePortalsContainer };

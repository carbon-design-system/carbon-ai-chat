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

import {
  ChatInstance,
  WriteableElements,
} from "../../../../types/instance/ChatInstance";
import { RenderWriteableElementResponse } from "../../../../types/component/ChatContainer";

interface WriteableElementsPortalsContainer {
  /**
   * The instance of a Carbon AI Chat that this component will register listeners on.
   */
  chatInstance: ChatInstance;

  /**
   * The function that this component will use to request the actual React content to display for each user defined
   * response.
   */
  renderResponseMap: RenderWriteableElementResponse;
}

/**
 * This is a utility component that is used to manage all the writeable elements that are rendered by Carbon AI Chat.
 * React portals are a mechanism that allows you to render a component in your React application but attach that
 * component to the HTML element that was provided by Carbon AI Chat.
 *
 * This component will render a portal for each user defined response. The contents of that portal will be
 * determined by calling the provided "renderResponse" render prop.
 */
function WriteableElementsPortalsContainer({
  chatInstance,
  renderResponseMap,
}: WriteableElementsPortalsContainer) {
  // All we need to do to enable the React portals is to render each portal somewhere in your application (it
  // doesn't really matter where).
  return (
    <>
      {Object.keys(chatInstance.writeableElements).map(
        (key: keyof WriteableElements) => {
          const responseItem = renderResponseMap[key];
          return responseItem ? (
            <WriteableElementsComponentPortal
              key={key}
              hostElement={chatInstance.writeableElements[key]}
            >
              {responseItem}
            </WriteableElementsComponentPortal>
          ) : null;
        },
      )}
    </>
  );
}

/**
 * This is the component that will attach a React portal to the given host element. The host element is the element
 * provided by Carbon AI Chat where your user defined response will be displayed in the DOM. This portal will attach any React
 * children passed to it under this component so you can render the response using your own React application. Those
 * children will be rendered under the given element where it lives in the DOM.
 */
function WriteableElementsComponentPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode;
}) {
  return ReactDOM.createPortal(children, hostElement);
}

const WriteableElementsPortalsContainerExport = React.memo(
  WriteableElementsPortalsContainer,
);
export { WriteableElementsPortalsContainerExport as WriteableElementsPortalsContainer };

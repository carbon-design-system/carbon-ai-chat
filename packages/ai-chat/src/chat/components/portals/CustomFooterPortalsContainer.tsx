/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

import { ChatInstance } from "../../../types/instance/ChatInstance";
import {
  RenderCustomMessageFooter,
  RenderCustomMessageFooterState,
} from "../../../types/component/ChatContainer";

/**
 * Internal state object used by CustomFooterPortalsContainer to track each custom footer slot.
 *
 * Structurally identical to the public {@link RenderCustomMessageFooterState}; aliased here so the
 * type has a single source of truth while keeping the name `ChatAppEntry` imports.
 */
type CustomFooterSlotState = RenderCustomMessageFooterState;

interface CustomFooterPortalsContainerProps {
  /**
   * The instance of a Carbon AI Chat that this component will register listeners on.
   */
  chatInstance: ChatInstance;

  /**
   * The function that this component will use to request the actual React content to display for each
   * custom message footer
   */
  renderCustomMessageFooter?: RenderCustomMessageFooter;

  /**
   * The list of events gathered by slot name that were fired that contain all the custom footers to render.
   */
  customFooterEventsBySlot: {
    [key: string]: CustomFooterSlotState;
  };

  /**
   * The chat wrapper element where slot elements should be appended
   */
  chatWrapper?: HTMLElement;
}

/**
 * This is a utility component that is used to manage all the custom message footers that are rendered by Carbon AI Chat.
 * When a custom message footer is received by Carbon AI Chat, it will fire a "customFooterSlot" event that
 * provides an HTML element to which your application can attach a custom footer. React portals are a mechanism
 * that allows you to render a component in your React application but attach that component to the HTML element
 * that was provided by Carbon AI Chat.
 *
 * This component will render a portal for each custom message footer. The contents of that portal will be
 * determined by calling the provided "renderCustomMesssageFooter" render prop.
 */
function CustomFooterPortalsContainer({
  chatInstance,
  renderCustomMessageFooter,
  customFooterEventsBySlot,
  chatWrapper,
}: CustomFooterPortalsContainerProps) {
  // Use a ref to store slot elements so they persist across renders
  const slotElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // In the case that a new history is passed in, we want to ensure
  // the previous custom footer slots are removed
  useEffect(() => {
    const removeExpiredSlots = () => {
      for (const [slot, el] of slotElementsRef.current.entries()) {
        if (!(slot in customFooterEventsBySlot)) {
          // Detach from DOM (safe even if not attached)
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          } else {
            el.remove?.();
          }
          slotElementsRef.current.delete(slot);
        }
      }
    };
    removeExpiredSlots();
  }, [customFooterEventsBySlot]);

  const getOrCreateSlotElement = (slot: string): HTMLElement => {
    let hostElement = slotElementsRef.current.get(slot);

    if (!hostElement) {
      // Create a new slot element
      hostElement = document.createElement("div");
      hostElement.setAttribute("slot", slot);

      // Add it to the chat wrapper
      if (chatWrapper) {
        slotElementsRef.current.set(slot, hostElement);
        chatWrapper.appendChild(hostElement);
      }
    }

    return hostElement;
  };

  // All we need to do to enable the React portals is to render each portal somewhere in your application (it
  // doesn't really matter where).
  return renderCustomMessageFooter
    ? Object.entries(customFooterEventsBySlot).map(([slotName, slotState]) => {
        const hostElement = getOrCreateSlotElement(slotName);
        const { message, messageItem, additionalData } = slotState;

        return (
          <CustomFooterComponentPortal key={slotName} hostElement={hostElement}>
            {renderCustomMessageFooter(
              slotName,
              message,
              messageItem,
              chatInstance,
              additionalData,
            )}
          </CustomFooterComponentPortal>
        );
      })
    : null;
}

/**
 * This is the component that will attach a React portal to the given host element. The host element is the element
 * provided by Carbon AI Chat where your custom message footer will be displayed in the DOM. This portal will attach any React
 * children passed to it under this component so you can render the response using your own React application. Those
 * children will be rendered under the given element where it lives in the DOM.
 */
function CustomFooterComponentPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode;
}) {
  return ReactDOM.createPortal(children, hostElement);
}

const CustomFooterPortalsContainerExport = React.memo(
  CustomFooterPortalsContainer,
);
export { CustomFooterPortalsContainerExport as CustomFooterPortalsContainer };
export type { CustomFooterSlotState };

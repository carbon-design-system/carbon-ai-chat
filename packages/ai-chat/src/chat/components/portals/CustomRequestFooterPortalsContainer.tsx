/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { ChatInstance } from '../../../types/instance/ChatInstance';
import {
  RenderCustomRequestFooter,
  RenderCustomRequestFooterState,
} from '../../../types/component/ChatContainer';

/**
 * Internal state object used by CustomRequestFooterPortalsContainer to track each footer slot.
 *
 * Structurally identical to the public {@link RenderCustomRequestFooterState}; aliased here so the
 * type has a single source of truth while keeping the name `ChatAppEntry` imports.
 */
type CustomRequestFooterSlotState = RenderCustomRequestFooterState;

interface CustomRequestFooterPortalsContainerProps {
  /**
   * The instance of a Carbon AI Chat that this component will register listeners on.
   */
  chatInstance: ChatInstance;

  /**
   * The function that this component will use to request the actual React content to display below each
   * user message.
   */
  renderCustomRequestFooter?: RenderCustomRequestFooter;

  /**
   * The list of events gathered by slot name that were fired that contain all the footers to render.
   */
  customRequestFooterEventsBySlot: {
    [key: string]: CustomRequestFooterSlotState;
  };

  /**
   * The chat wrapper element where slot elements should be appended
   */
  chatWrapper?: HTMLElement;
}

/**
 * This is a utility component that is used to manage all the footers rendered below user messages. When a user
 * message renders, Carbon AI Chat fires a "customRequestFooterSlot" event that provides a slot to which your
 * application can attach a footer. React portals are a mechanism that allows you to render a component in your React
 * application but attach that component to the HTML element that was provided by Carbon AI Chat.
 *
 * This component will render a portal for each footer. The contents of that portal will be determined by calling the
 * provided "renderCustomRequestFooter" render prop.
 *
 * This duplicates CustomFooterPortalsContainer rather than sharing with it. The payloads differ, and #1853 is about
 * to rewrite both, so a shared abstraction would be written twice.
 */
function CustomRequestFooterPortalsContainer({
  chatInstance,
  renderCustomRequestFooter,
  customRequestFooterEventsBySlot,
  chatWrapper,
}: CustomRequestFooterPortalsContainerProps) {
  // Use a ref to store slot elements so they persist across renders
  const slotElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // In the case that a new history is passed in, we want to ensure
  // the previous footer slots are removed
  useEffect(() => {
    const removeExpiredSlots = () => {
      for (const [slot, el] of slotElementsRef.current.entries()) {
        if (!(slot in customRequestFooterEventsBySlot)) {
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
  }, [customRequestFooterEventsBySlot]);

  const removeSlotElement = (slot: string) => {
    const hostElement = slotElementsRef.current.get(slot);
    if (hostElement) {
      hostElement.remove();
      slotElementsRef.current.delete(slot);
    }
  };

  const getOrCreateSlotElement = (slot: string): HTMLElement => {
    let hostElement = slotElementsRef.current.get(slot);

    if (!hostElement) {
      // Create a new slot element
      hostElement = document.createElement('div');
      hostElement.setAttribute('slot', slot);

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
  return renderCustomRequestFooter
    ? Object.entries(customRequestFooterEventsBySlot).map(
        ([slotName, slotState]) => {
          const content = renderCustomRequestFooter(
            slotName,
            slotState.message,
            chatInstance
          );

          // Ask before creating the host element. An empty one still picks up
          // the slotted margin, so a callback that returns null for a message
          // would otherwise leave a gap under that bubble.
          if (!content) {
            removeSlotElement(slotName);
            return null;
          }

          return (
            <CustomRequestFooterComponentPortal
              key={slotName}
              hostElement={getOrCreateSlotElement(slotName)}>
              {content}
            </CustomRequestFooterComponentPortal>
          );
        }
      )
    : null;
}

/**
 * This is the component that will attach a React portal to the given host element. The host element is the element
 * provided by Carbon AI Chat where your footer will be displayed in the DOM. This portal will attach any React
 * children passed to it under this component so you can render the footer using your own React application. Those
 * children will be rendered under the given element where it lives in the DOM.
 */
function CustomRequestFooterComponentPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode;
}) {
  return ReactDOM.createPortal(children, hostElement);
}

const CustomRequestFooterPortalsContainerExport = React.memo(
  CustomRequestFooterPortalsContainer
);
export { CustomRequestFooterPortalsContainerExport as CustomRequestFooterPortalsContainer };
export type { CustomRequestFooterSlotState };

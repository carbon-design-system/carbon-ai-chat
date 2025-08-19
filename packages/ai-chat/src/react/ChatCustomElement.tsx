/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useRef, useState } from "react";

import { ChatInstance } from "../types/instance/ChatInstance";
import {
  BusEventType,
  BusEventViewChange,
} from "../types/events/eventBusTypes";
import { ChatContainer, ChatContainerProps } from "./ChatContainer";

/**
 * This is the React component for people injecting a Carbon AI Chat with a custom element.
 *
 * It provides said element any class or id defined on itself for styling. It then calls ChatContainer with the custom
 * element passed in as a property to be used instead of generating an element with the default properties for a
 * floating chat.
 *
 */

/** @category React */
interface ChatCustomElementProps extends ChatContainerProps {
  /**
   * An optional classname that will be added to the custom element.
   */
  className?: string;

  /**
   * An optional id that will be added to the custom element.
   */
  id?: string;

  /**
   * An optional listener for "view:change" events. Such a listener is required when using a custom element in order
   * to control the visibility of the Carbon AI Chat main window. If no callback is provided here, a default one will be
   * used that injects styling into the app that will show and hide the Carbon AI Chat main window and also change the
   * size of the custom element so it doesn't take up space when the main window is closed.
   *
   * You can provide a different callback here if you want custom behavior such as an animation when the main window
   * is opened or closed.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded. After Carbon AI Chat is loaded, the event
   * handler will not be updated.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;
}

function ChatCustomElement({
  config,
  onBeforeRender,
  onAfterRender,
  renderUserDefinedResponse,
  renderWriteableElements,
  className,
  id,
  onViewChange,
}: ChatCustomElementProps) {
  const [customElement, setCustomElement] = useState<HTMLDivElement>();
  const originalStyles = useRef({ width: undefined, height: undefined });

  const onBeforeRenderOverride = useCallback(
    async (instance: ChatInstance) => {
      /**
       * A default handler for the "view:change" event. This will be used to show or hide the Carbon AI Chat main window
       * using a simple classname.
       */
      function defaultViewChangeHandler(event: any, instance: ChatInstance) {
        if (event.newViewState.mainWindow) {
          customElement.style.width = originalStyles.current.width;
          customElement.style.height = originalStyles.current.height;
          instance.elements.getMainWindow().removeClassName("HideWebChat");
        } else {
          originalStyles.current = {
            width: customElement.style.width,
            height: customElement.style.height,
          };
          customElement.style.width = "0px";
          customElement.style.height = "0px";
          instance.elements.getMainWindow().addClassName("HideWebChat");
        }
      }

      instance.on({
        type: BusEventType.VIEW_CHANGE,
        handler: onViewChange || defaultViewChangeHandler,
      });

      return onBeforeRender?.(instance);
    },
    [onBeforeRender, onViewChange, customElement],
  );

  return (
    <div className={className} id={id} ref={setCustomElement}>
      {customElement && (
        <ChatContainer
          config={config}
          onBeforeRender={onBeforeRenderOverride}
          onAfterRender={onAfterRender}
          renderUserDefinedResponse={renderUserDefinedResponse}
          renderWriteableElements={renderWriteableElements}
          element={customElement}
        />
      )}
    </div>
  );
}

/** @category React */
const ChatCustomElementExport = React.memo(
  ChatCustomElement,
) as React.FC<ChatCustomElementProps>;

export { ChatCustomElementExport as ChatCustomElement, ChatCustomElementProps };

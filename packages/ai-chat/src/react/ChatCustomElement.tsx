/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useState } from "react";

import { ChatInstance } from "../types/instance/ChatInstance";
import {
  BusEventType,
  BusEventViewChange,
} from "../types/events/eventBusTypes";
import { ChatContainer, ChatContainerProps } from "./ChatContainer";
import { isBrowser } from "../chat/shared/utils/browserUtils";

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
   * A CSS class name that will be added to the custom element. This class must define the size of the
   * chat when it is open (width and height or using logical inline-size/block-size).
   */
  className: string;

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

// CSP-friendly style injection for hiding the chat element
const customElementStylesheet =
  isBrowser && typeof CSSStyleSheet !== "undefined"
    ? new CSSStyleSheet()
    : null;

const hideStyles = `
  .cds-aichat--hidden {
    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 0 !important;
    max-height: 0 !important;
    inline-size: 0 !important;
    block-size: 0 !important;
    min-inline-size: 0 !important;
    min-block-size: 0 !important;
    max-inline-size: 0 !important;
    max-block-size: 0 !important;
    overflow: hidden !important;
  }
`;

// Inject styles using adopted stylesheets when available, fallback to style element
if (isBrowser && !document.getElementById("cds-aichat-custom-element-styles")) {
  if (customElementStylesheet && "replaceSync" in customElementStylesheet) {
    customElementStylesheet.replaceSync(hideStyles);
    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      customElementStylesheet,
    ];
  } else {
    // Fallback for when adoptedStyleSheets are not supported
    const style = document.createElement("style");
    style.id = "cds-aichat-custom-element-styles";
    style.textContent = hideStyles;
    document.head.appendChild(style);
  }
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

  const onBeforeRenderOverride = useCallback(
    async (instance: ChatInstance) => {
      /**
       * A default handler for the "view:change" event. This will be used to show or hide the Carbon AI Chat main window
       * by adding/removing a CSS class that sets the element size to 0x0 when hidden.
       */
      function defaultViewChangeHandler(event: any) {
        if (customElement) {
          if (event.newViewState.mainWindow) {
            // Show: remove the hidden class, let the provided className handle sizing
            customElement.classList.remove("cds-aichat--hidden");
          } else {
            // Hide: add the hidden class to set size to 0x0
            customElement.classList.add("cds-aichat--hidden");
          }
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

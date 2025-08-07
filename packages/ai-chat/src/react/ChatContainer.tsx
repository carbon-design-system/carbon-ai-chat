/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import { css, LitElement, PropertyValues } from "lit";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AppContainer } from "../chat/react/components/AppContainer";
import { carbonElement } from "../chat/web-components/decorators/customElement";
import { ChatContainerProps } from "../types/component/ChatContainer";
import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
} from "../types/events/eventBusTypes";
import { ChatInstance } from "../types/instance/ChatInstance";
import { isBrowser } from "../chat/shared/utils/browserUtils";

/**
 * This component creates a custom element protected by a ShadowRoot to render the React application into. It creates
 * slotted elements for user_defined responses and for writable elements.
 *
 * The corresponding slots are defined within the React application and are rendered in place.
 */

/**
 * Create a web component to host the React application. We do this so we can provide custom elements and user_defined responses as
 * slotted content so they maintain their own styling in a safe way.
 */
@carbonElement("cds-aichat-react")
class ChatContainerReact extends LitElement {
  static styles = css`
    :host {
      width: 100%;
      height: 100%;
    }
  `;

  /**
   * Dispatch a custom event when the shadow root is ready
   * This ensures React can safely access shadowRoot
   */
  firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.dispatchEvent(new CustomEvent("shadow-ready", { bubbles: true }));
  }
}

// Wrap the custom element as a React component
const ReactChatContainer = React.memo(
  createComponent({
    tagName: "cds-aichat-react",
    elementClass: ChatContainerReact,
    react: React,
  })
);

/**
 * The ChatContainer controls rendering the React application into the ShadowRoot of the cds-aichat-react web component.
 * It also injects the writeable element and user_defined response slots into said web component.
 */
function ChatContainer({
  onBeforeRender,
  onAfterRender,
  config,
  renderUserDefinedResponse,
  renderWriteableElements,
  element,
}: ChatContainerProps) {
  const wrapperRef = useRef(null); // Ref for the React wrapper component
  const [wrapper, setWrapper] = useState(null);
  const [container, setContainer] = useState<HTMLElement | null>(null); // Actual element we render the React Portal to in the Shadowroot.

  const [userDefinedElements, setUserDefinedElements] = useState<HTMLElement[]>(
    []
  );
  const [writeableElementSlots, setWriteableElementSlots] = useState<
    HTMLElement[]
  >([]);
  const [currentInstance, setCurrentInstance] = useState<ChatInstance>(null);

  /**
   * Setup the DOM nodes of both the web component to be able to inject slotted content into it, and the element inside the
   * ShadowRoot we will inject our React application into.
   */
  useEffect(() => {
    if (!wrapperRef.current) {
      return null; // Early return when there's nothing to set up because the element isn't ready.
    }

    let eventListenerAdded = false;

    const wrapperElement = wrapperRef.current as unknown as ChatContainerReact;

    // We need to check if the element in the ShadowRoot we are render the React application to exists.
    // If it doesn't, we need to create and append it.

    // When the Carbon AI Chat is destroyed (either via a config change or by calling instance.destroy), this element is
    // removed again. When the chat is destroyed the instance is set to null. The useEffect watches the instance
    // value and runs if it changes, re-creating the container element if needed.

    const handleShadowReady = () => {
      // Now we know shadowRoot is definitely available
      let reactElement = wrapperElement.shadowRoot.querySelector(
        ".cds--aichat-react-app"
      ) as HTMLElement;

      if (!reactElement) {
        reactElement = document.createElement("div");
        reactElement.classList.add("cds--aichat-react-app");
        wrapperElement.shadowRoot.appendChild(reactElement);
      }

      if (wrapperElement !== wrapper) {
        setWrapper(wrapperElement);
      }
      if (reactElement !== container) {
        setContainer(reactElement);
      }
    };

    if (wrapperElement.shadowRoot) {
      // Already ready
      handleShadowReady();
    } else {
      // Wait for ready event
      eventListenerAdded = true;
      wrapperElement.addEventListener("shadow-ready", handleShadowReady, {
        once: true,
      });
    }

    return () => {
      if (eventListenerAdded) {
        wrapperElement.removeEventListener("shadow-ready", handleShadowReady);
      }
    };
  }, [container, wrapper, currentInstance]);

  /**
   * Here we write the slotted elements into the wrapper so they are passed into the application to be rendered in their slot.
   */
  useEffect(() => {
    if (wrapper) {
      const combinedNodes: HTMLElement[] = [
        ...userDefinedElements,
        ...writeableElementSlots,
      ];
      const currentNodes: HTMLElement[] = Array.from(
        wrapper.childNodes
      ) as HTMLElement[];
      const newNodesSet = new Set(combinedNodes);

      // Remove nodes no longer present
      currentNodes.forEach((node) => {
        if (!newNodesSet.has(node)) {
          wrapper.removeChild(node);
        }
      });

      // Append new nodes that aren't already in the container
      combinedNodes.forEach((node) => {
        if (!currentNodes.includes(node)) {
          wrapper.appendChild(node);
        }
      });
    }
  }, [userDefinedElements, writeableElementSlots, wrapper]);

  const userDefinedHandler = useCallback(
    (event: BusEventUserDefinedResponse | BusEventChunkUserDefinedResponse) => {
      const { element } = event.data;
      setUserDefinedElements((previousUserDefinedElements) => [
        ...previousUserDefinedElements,
        element,
      ]);
    },
    []
  );

  const onBeforeRenderOverride = useCallback(
    (instance: ChatInstance) => {
      if (instance) {
        const addWriteableElementSlots = () => {
          const slots: HTMLElement[] = Object.entries(
            instance.writeableElements
          ).map((writeableElement) => {
            const [key, element] = writeableElement;
            element.setAttribute("slot", key); // Assign slot attributes dynamically
            return element;
          });
          setWriteableElementSlots(slots);
        };
        instance.on({
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefinedHandler,
        });
        instance.on({
          type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
          handler: userDefinedHandler,
        });
        addWriteableElementSlots();
        onBeforeRender?.(instance);
      }
    },
    [onBeforeRender, userDefinedHandler]
  );

  // If we are in SSR mode, just short circuit here. This prevents all of our window.* and document.* stuff from trying
  // to run and erroring out.
  if (!isBrowser) {
    return null;
  }

  return (
    <>
      <ReactChatContainer ref={wrapperRef} />
      {container &&
        createPortal(
          <AppContainer
            config={config}
            renderUserDefinedResponse={renderUserDefinedResponse}
            renderWriteableElements={renderWriteableElements}
            onBeforeRender={onBeforeRenderOverride}
            onAfterRender={onAfterRender}
            container={container}
            setParentInstance={setCurrentInstance}
            element={element}
          />,
          container // Render AppContainer into the shadowRoot
        )}
    </>
  );
}

/** @category React */
const ChatContainerExport = React.memo(
  ChatContainer
) as React.FC<ChatContainerProps>;

export { ChatContainerExport as ChatContainer, ChatContainerProps };

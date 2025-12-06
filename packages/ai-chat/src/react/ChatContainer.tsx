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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import App from "../chat/ChatAppEntry";
import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { ChatContainerProps } from "../types/component/ChatContainer";
import { ChatInstance } from "../types/instance/ChatInstance";
import { PublicConfig } from "../types/config/PublicConfig";
import { isBrowser } from "../chat/utils/browserUtils";

/**
 * This component creates a custom element protected by a shadow DOM to render the React application into. It creates
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
   * Dispatch a custom event when the shadow DOM is ready
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
  }),
);

/**
 * The ChatContainer controls rendering the React application into the shadow DOM of the cds-aichat-react web component.
 * It also injects the writeable element and user_defined response slots into said web component.
 *
 * @category React
 */
function ChatContainer(props: ChatContainerProps) {
  const {
    onBeforeRender,
    onAfterRender,
    strings,
    serviceDeskFactory,
    serviceDesk,
    renderUserDefinedResponse,
    renderWriteableElements,
    element,
    // Flattened PublicConfig properties
    onError,
    openChatByDefault,
    disclaimer,
    disableCustomElementMobileEnhancements,
    debug,
    exposeServiceManagerForTesting,
    injectCarbonTheme,
    aiEnabled,
    shouldTakeFocusIfOpensAutomatically,
    namespace,
    enableFocusTrap,
    shouldSanitizeHTML,
    header,
    layout,
    messaging,
    isReadonly,
    assistantName,
    locale,
    homescreen,
    launcher,
    input,
  } = props;
  // Reconstruct PublicConfig from flattened props
  const config = useMemo(
    (): PublicConfig => ({
      onError,
      openChatByDefault,
      disclaimer,
      disableCustomElementMobileEnhancements,
      debug,
      exposeServiceManagerForTesting,
      injectCarbonTheme,
      aiEnabled,
      shouldTakeFocusIfOpensAutomatically,
      namespace,
      enableFocusTrap,
      shouldSanitizeHTML,
      header,
      layout,
      messaging,
      isReadonly,
      assistantName,
      locale,
      homescreen,
      launcher,
      input,
    }),
    [
      onError,
      openChatByDefault,
      disclaimer,
      disableCustomElementMobileEnhancements,
      debug,
      exposeServiceManagerForTesting,
      injectCarbonTheme,
      aiEnabled,
      shouldTakeFocusIfOpensAutomatically,
      namespace,
      enableFocusTrap,
      shouldSanitizeHTML,
      header,
      layout,
      messaging,
      isReadonly,
      assistantName,
      locale,
      homescreen,
      launcher,
      input,
    ],
  );
  const wrapperRef = useRef(null); // Ref for the React wrapper component
  const [wrapper, setWrapper] = useState(null);
  const [container, setContainer] = useState<HTMLElement | null>(null); // Actual element we render the React Portal to in the Shadowroot.

  const [writeableElementSlots, setWriteableElementSlots] = useState<
    HTMLElement[]
  >([]);
  const [currentInstance, setCurrentInstance] = useState<ChatInstance>(null);

  /**
   * Setup the DOM nodes of both the web component to be able to inject slotted content into it, and the element inside the
   * shadow DOM we will inject our React application into.
   */
  useEffect(() => {
    if (!wrapperRef.current) {
      return null; // Early return when there's nothing to set up because the element isn't ready.
    }

    let eventListenerAdded = false;

    const wrapperElement = wrapperRef.current as unknown as ChatContainerReact;

    // We need to check if the element in the shadow DOM we are render the React application to exists.
    // If it doesn't, we need to create and append it.

    const handleShadowReady = () => {
      // Now we know shadowRoot is definitely available
      let reactElement = wrapperElement.shadowRoot.querySelector(
        ".cds-aichat--react-app",
      ) as HTMLElement;

      if (!reactElement) {
        reactElement = document.createElement("div");
        reactElement.classList.add("cds-aichat--react-app");
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
      const combinedNodes: HTMLElement[] = [...writeableElementSlots];
      const currentNodes: HTMLElement[] = Array.from(
        wrapper.childNodes,
      ) as HTMLElement[];

      // Append new nodes that aren't already in the container
      combinedNodes.forEach((node) => {
        if (!currentNodes.includes(node)) {
          wrapper.appendChild(node);
        }
      });
    }
  }, [writeableElementSlots, wrapper]);

  const onBeforeRenderOverride = useCallback(
    (instance: ChatInstance) => {
      if (instance) {
        const addWriteableElementSlots = () => {
          const slots: HTMLElement[] = Object.entries(
            instance.writeableElements,
          ).map((writeableElement) => {
            const [key, element] = writeableElement;
            element.setAttribute("slot", key); // Assign slot attributes dynamically
            return element;
          });
          setWriteableElementSlots(slots);
        };

        addWriteableElementSlots();
        onBeforeRender?.(instance);
      }
    },
    [onBeforeRender],
  );

  // If we are in SSR mode, just short circuit here. This prevents all of our window.* and document.* stuff from trying
  // to run and erroring out.
  if (!isBrowser()) {
    return null;
  }

  return (
    <>
      <ReactChatContainer ref={wrapperRef} />
      {container &&
        createPortal(
          <App
            key="stable-chat-instance" // Prevent remounting on config changes
            config={config}
            strings={strings}
            serviceDeskFactory={serviceDeskFactory}
            serviceDesk={serviceDesk}
            renderUserDefinedResponse={renderUserDefinedResponse}
            renderWriteableElements={renderWriteableElements}
            onBeforeRender={onBeforeRenderOverride}
            onAfterRender={onAfterRender}
            container={container}
            setParentInstance={setCurrentInstance}
            element={element}
            chatWrapper={wrapper}
          />,
          container, // Render AppContainer into the shadowRoot
        )}
    </>
  );
}

export { ChatContainer, ChatContainerProps };

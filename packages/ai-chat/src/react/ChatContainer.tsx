/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import { css, LitElement, PropertyValues } from "lit";
import React, {
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import ChatAppEntry from "../chat/ChatAppEntry";
import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import { ChatContainerProps } from "../types/component/ChatContainer";
import { ChatInstance } from "../types/instance/ChatInstance";
import { BusEventType } from "../types/events/eventBusTypes";
import {
  FLATTENED_PUBLIC_CONFIG_FIELDS,
  FlattenedConfigSource,
  resolveFlattenedConfig,
} from "../web-components/shared/flattenedPublicConfig";
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
function ChatContainer(
  props: ChatContainerProps &
    Omit<HTMLAttributes<HTMLElement>, keyof ChatContainerProps>,
) {
  const {
    onBeforeRender,
    onAfterRender,
    onViewChange,
    onViewPreChange,
    renderUserDefinedResponse,
    renderUserDefinedInputNode,
    renderCustomMessageFooter,
    renderWriteableElements,
    element,
    // Everything else is either a flattened PublicConfig field (folded into
    // `config` below) or an arbitrary DOM attribute forwarded to the host.
    ...rest
  } = props;

  // Reconstruct the PublicConfig from the flattened props using the same shared
  // table + folder the web components use (`resolveFlattenedConfig` driven by
  // `FLATTENED_PUBLIC_CONFIG_FIELDS`), so the two surfaces cannot drift. Every
  // flattened field — including `strings`, `markdown`, `serviceDesk`, and
  // `serviceDeskFactory` — is folded into `config` here, so `ChatAppEntry`
  // receives a single effective `config` with no separate side-channel props.
  const flattenedSource = rest as unknown as FlattenedConfigSource;
  const config = useMemo(
    () => resolveFlattenedConfig(flattenedSource),
    // The dependency list is derived from the shared field table, so it can
    // never drift from the set of fields folded above (the old hand-written
    // list did). Each value is compared by identity, so the memo recomputes
    // only when a real config field changes — preserving `config` referential
    // stability across unrelated host re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    FLATTENED_PUBLIC_CONFIG_FIELDS.map(
      (field) => (rest as Record<string, unknown>)[field.name],
    ),
  );

  // DOM pass-through props are whatever remains after removing the flattened
  // config fields (forwarded via `config`) — e.g. `className`, `id`, `style`,
  // `aria-*`. Driven by the same table so a newly-added config field can never
  // leak onto the host element.
  const domProps: Record<string, unknown> = { ...flattenedSource };
  for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
    delete domProps[field.name];
  }

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

  /**
   * Plugin-fallback slot hosts (e.g. KaTeX rendered by a markdown-it plugin)
   * need to live in the page light DOM so a consumer-loaded stylesheet can
   * reach them — the markdown element's own light DOM sits inside this
   * wrapper's shadow root, where global CSS doesn't apply. The markdown
   * element bubbles a composed `cds-aichat-markdown-plugin-host-mount` event
   * for each new plugin slot; we accept the offer (`preventDefault()`),
   * create the host as a slot-attributed child of the wrapper (= page light
   * DOM, since this is the outermost chat element on the React path), and
   * tear it down when the matching unmount event fires.
   */
  useEffect(() => {
    if (!wrapper) {
      return undefined;
    }
    const hosts = new Map<string, HTMLElement>();
    const handleMount = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          slotName: string;
          html?: string;
          element?: HTMLElement;
          isInline: boolean;
        }>
      ).detail;
      if (!detail?.slotName) {
        return;
      }
      event.preventDefault();
      // Custom-renderer hosts (table/codeBlock) forward a live element — the
      // markdown element keeps ownership of its content; we only relocate the
      // node into page light DOM so the consumer's global CSS reaches it.
      // Plugin fallbacks forward an HTML string instead.
      if (detail.element) {
        const element = detail.element;
        element.setAttribute("slot", detail.slotName);
        if (!detail.isInline) {
          element.style.marginBlockStart = "1rem";
        }
        if (element.parentElement !== wrapper) {
          wrapper.appendChild(element);
        }
        return;
      }
      let host = hosts.get(detail.slotName);
      if (!host) {
        host = document.createElement(detail.isInline ? "span" : "div");
        host.setAttribute("slot", detail.slotName);
        // Match the spacing applied to direct children of
        // `.cds-aichat-markdown-stack`; shadow CSS doesn't reach this host
        // (we mounted it in page light DOM), so apply it inline. Inline
        // plugin output flows with text and gets no extra spacing.
        if (!detail.isInline) {
          host.style.marginBlockStart = "1rem";
        }
        hosts.set(detail.slotName, host);
        wrapper.appendChild(host);
      }
      if (host.innerHTML !== (detail.html ?? "")) {
        host.innerHTML = detail.html ?? "";
      }
    };
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ slotName: string; html: string }>)
        .detail;
      if (!detail?.slotName) {
        return;
      }
      const host = hosts.get(detail.slotName);
      if (host && host.innerHTML !== detail.html) {
        host.innerHTML = detail.html;
      }
    };
    const handleUnmount = (event: Event) => {
      const detail = (event as CustomEvent<{ slotName: string }>).detail;
      if (!detail?.slotName) {
        return;
      }
      const host = hosts.get(detail.slotName);
      if (host) {
        host.remove();
        hosts.delete(detail.slotName);
      }
    };
    wrapper.addEventListener(
      "cds-aichat-markdown-plugin-host-mount",
      handleMount,
    );
    wrapper.addEventListener(
      "cds-aichat-markdown-plugin-host-update",
      handleUpdate,
    );
    wrapper.addEventListener(
      "cds-aichat-markdown-plugin-host-unmount",
      handleUnmount,
    );
    return () => {
      wrapper.removeEventListener(
        "cds-aichat-markdown-plugin-host-mount",
        handleMount,
      );
      wrapper.removeEventListener(
        "cds-aichat-markdown-plugin-host-update",
        handleUpdate,
      );
      wrapper.removeEventListener(
        "cds-aichat-markdown-plugin-host-unmount",
        handleUnmount,
      );
      for (const host of hosts.values()) {
        host.remove();
      }
      hosts.clear();
    };
  }, [wrapper]);

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

        // Opt-in view-change observation hooks. The float container manages
        // its own visibility, so there is no default handler — a prop is only
        // subscribed when the consumer provides it.
        if (onViewPreChange) {
          instance.on({
            type: BusEventType.VIEW_PRE_CHANGE,
            handler: onViewPreChange,
          });
        }
        if (onViewChange) {
          instance.on({
            type: BusEventType.VIEW_CHANGE,
            handler: onViewChange,
          });
        }

        onBeforeRender?.(instance);
      }
    },
    [onBeforeRender, onViewChange, onViewPreChange],
  );

  // If we are in SSR mode, just short circuit here. This prevents all of our window.* and document.* stuff from trying
  // to run and erroring out.
  if (!isBrowser()) {
    return null;
  }

  return (
    <>
      <ReactChatContainer
        ref={wrapperRef}
        {...(domProps as HTMLAttributes<HTMLElement>)}
      />
      {container &&
        createPortal(
          <ChatAppEntry
            key="stable-chat-instance"
            config={config}
            renderUserDefinedResponse={renderUserDefinedResponse}
            renderUserDefinedInputNode={renderUserDefinedInputNode}
            renderCustomMessageFooter={renderCustomMessageFooter}
            renderWriteableElements={renderWriteableElements}
            onBeforeRender={onBeforeRenderOverride}
            onAfterRender={onAfterRender}
            container={container}
            setParentInstance={setCurrentInstance}
            element={element}
            chatWrapper={wrapper}
          />,
          container,
        )}
    </>
  );
}

export { ChatContainer, ChatContainerProps };

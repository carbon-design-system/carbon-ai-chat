/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

import {
  LIGHT_DOM_PORTAL_EVENT,
  type LightDomPortalEventDetail,
} from "@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/render-in-light-dom.js";

/**
 * Tracked state for a single light-DOM portal.
 */
interface LightDomPortalEntry {
  /** Unique key for React reconciliation. */
  key: string;
  /** The `<slot>` element inserted into the shadow-side container. */
  slotElement: HTMLSlotElement;
  /** The `<span slot="...">` or `<div slot="...">` element appended to `chatWrapper` (page light DOM). */
  hostElement: HTMLElement;
  /** The React node the caller passed (if any). */
  reactNode: React.ReactNode | null;
}

interface LightDomPortalsContainerProps {
  /** The chat wrapper element (`<cds-aichat-react>`) whose light DOM hosts portal targets. */
  chatWrapper?: HTMLElement;
}

let lightDomSlotCounter = 0;

/**
 * Manages React portals for the generic light-DOM portal handshake
 * ({@link LIGHT_DOM_PORTAL_EVENT}) so content built inside the shadow-DOM
 * editor — mention/command custom tokens *and* host-authored `addNodeView`
 * nodes — renders in the page's light DOM where external CSS applies.
 *
 * Same architectural pattern as {@link UserDefinedResponsePortalsContainer} and
 * {@link WriteableElementsPortalsContainer}: content is appended to
 * `chatWrapper`'s light DOM with a `slot` attribute, and a matching `<slot>`
 * element inside the shadow tree projects it into the correct visual position.
 *
 * `renderInLightDom` (and its token-specific wrapper `renderTokenChip`)
 * dispatches the event; this container does the slot + light-DOM host wiring.
 */
function LightDomPortalsContainer({
  chatWrapper,
}: LightDomPortalsContainerProps) {
  const [portals, setPortals] = useState<LightDomPortalEntry[]>([]);
  const portalsRef = useRef(portals);
  portalsRef.current = portals;

  useEffect(() => {
    if (!chatWrapper) {
      return undefined;
    }

    const handlePortalRender = (evt: Event) => {
      const event = evt as CustomEvent<LightDomPortalEventDetail>;
      const { container, fallback, reactNode, htmlElement, hostTag } =
        event.detail;

      // Generate a unique slot name for this portal.
      const slotName = `cds-aichat-light-dom-${++lightDomSlotCounter}`;
      const key = slotName;

      // 1. Create a <slot> inside the shadow-side container. The optional
      //    fallback shows until the portal commits on the next frame.
      const slotEl = document.createElement("slot");
      slotEl.setAttribute("name", slotName);
      if (fallback) {
        slotEl.appendChild(fallback);
      }

      // Replace any existing content in the container with the slot.
      container.textContent = "";
      container.appendChild(slotEl);

      // 2. Create a light DOM element in chatWrapper (page light DOM).
      //    Page-level CSS applies here.
      const hostEl = document.createElement(hostTag ?? "span");
      hostEl.setAttribute("slot", slotName);
      chatWrapper.appendChild(hostEl);

      // 3. For HTMLElements, append directly — no React portal needed.
      //    For React nodes, track the entry so createPortal renders into hostEl.
      if (htmlElement) {
        hostEl.appendChild(htmlElement);
        // Still track for cleanup when the node is deleted.
        setPortals((prev) => [
          ...prev,
          { key, slotElement: slotEl, hostElement: hostEl, reactNode: null },
        ]);
      } else {
        setPortals((prev) => [
          ...prev,
          {
            key,
            slotElement: slotEl,
            hostElement: hostEl,
            reactNode: reactNode ?? null,
          },
        ]);
      }
    };

    chatWrapper.addEventListener(LIGHT_DOM_PORTAL_EVENT, handlePortalRender);
    return () => {
      chatWrapper.removeEventListener(
        LIGHT_DOM_PORTAL_EVENT,
        handlePortalRender,
      );
    };
  }, [chatWrapper]);

  // Prune portals whose slot element has been removed from the DOM
  // (e.g. user deleted a token/node via backspace or sent the message).
  useEffect(() => {
    if (portals.length === 0 || !chatWrapper) {
      return undefined;
    }

    const shadowRoot = chatWrapper.shadowRoot;
    if (!shadowRoot) {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      setPortals((prev) => {
        const next = prev.filter((entry) => entry.slotElement.isConnected);
        if (next.length === prev.length) {
          return prev;
        }

        // Remove orphaned light DOM elements
        prev
          .filter((entry) => !entry.slotElement.isConnected)
          .forEach((entry) => {
            if (entry.hostElement.parentNode) {
              entry.hostElement.remove();
            }
          });
        return next;
      });
    });

    observer.observe(shadowRoot, { childList: true, subtree: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portals.length > 0, chatWrapper]);

  // On unmount, remove all light DOM elements
  useEffect(() => {
    return () => {
      portalsRef.current.forEach((entry) => {
        if (entry.hostElement.parentNode) {
          entry.hostElement.remove();
        }
      });
    };
  }, []);

  return (
    <>
      {portals
        .filter((entry) => entry.reactNode != null)
        .map((entry) =>
          ReactDOM.createPortal(entry.reactNode, entry.hostElement, entry.key),
        )}
    </>
  );
}

const LightDomPortalsContainerExport = React.memo(LightDomPortalsContainer);
export { LightDomPortalsContainerExport as LightDomPortalsContainer };

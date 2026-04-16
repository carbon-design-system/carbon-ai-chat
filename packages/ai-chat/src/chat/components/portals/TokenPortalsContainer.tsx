/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

import type { SuggestionItem } from "@carbon/ai-chat-components/es/components/input/src/types.js";

/**
 * Tracked state for a single token portal.
 */
interface TokenPortalEntry {
  /** Unique key for React reconciliation. */
  key: string;
  /** The `<slot>` element inserted into the token span inside the shadow DOM. */
  slotElement: HTMLSlotElement;
  /** The `<span slot="...">` element appended to `chatWrapper` (page light DOM). */
  hostElement: HTMLSpanElement;
  /** The React node returned by the renderCustomToken callback (if React). */
  reactNode: React.ReactNode | null;
}

interface TokenPortalsContainerProps {
  /** The chat wrapper element (`<cds-aichat-react>`) whose light DOM hosts portal targets. */
  chatWrapper?: HTMLElement;
}

let tokenSlotCounter = 0;

/**
 * Manages React portals for custom token renderers (mentions/commands) so that
 * the rendered content lives in the page's light DOM where external CSS applies.
 *
 * This follows the same architectural pattern as {@link UserDefinedResponsePortalsContainer}
 * and {@link WriteableElementsPortalsContainer}: content is appended to `chatWrapper`'s
 * light DOM with a `slot` attribute, and a matching `<slot>` element inside the shadow
 * tree projects it into the correct visual position (inline in the ProseMirror editor).
 *
 * The token plugin (`token-plugin.ts`) dispatches a `cds-aichat-token-render` event
 * when a `renderCustomToken` returns a React node. This component intercepts that event,
 * sets up the slot projection, and portal-renders the React content.
 */
function TokenPortalsContainer({ chatWrapper }: TokenPortalsContainerProps) {
  const [portals, setPortals] = useState<TokenPortalEntry[]>([]);
  const portalsRef = useRef(portals);
  portalsRef.current = portals;

  useEffect(() => {
    if (!chatWrapper) {
      return undefined;
    }

    const handleTokenRender = (evt: Event) => {
      const event = evt as CustomEvent<{
        container: HTMLElement;
        item: SuggestionItem;
        type: string;
        reactNode?: React.ReactNode;
        htmlElement?: HTMLElement;
      }>;

      const { container, item, type, reactNode, htmlElement } = event.detail;

      // Generate a unique slot name for this token
      const slotName = `cds-aichat-token-${++tokenSlotCounter}`;
      const key = slotName;

      // 1. Create a <slot> inside the token container (shadow tree).
      //    The slot's fallback content is a default chip that shows until
      //    the portal renders on the next frame.
      const slotEl = document.createElement("slot");
      slotEl.setAttribute("name", slotName);

      const fallback = document.createElement("cds-tag");
      fallback.setAttribute("size", "sm");
      if (type === "mention") {
        fallback.setAttribute("type", "blue");
      } else if (type === "command") {
        fallback.setAttribute("type", "gray");
      }
      fallback.textContent = item.label || "";
      slotEl.appendChild(fallback);

      // Replace any existing content in the container with the slot
      container.textContent = "";
      container.appendChild(slotEl);

      // 2. Create a light DOM element in chatWrapper (page light DOM).
      //    Page-level CSS applies here.
      const hostEl = document.createElement("span");
      hostEl.setAttribute("slot", slotName);
      chatWrapper.appendChild(hostEl);

      // 3. For HTMLElements, append directly — no React portal needed.
      //    For React nodes, track the entry so createPortal renders into hostEl.
      if (htmlElement) {
        hostEl.appendChild(htmlElement);
        // Still track for cleanup when the token is deleted
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

    chatWrapper.addEventListener("cds-aichat-token-render", handleTokenRender);
    return () => {
      chatWrapper.removeEventListener(
        "cds-aichat-token-render",
        handleTokenRender,
      );
    };
  }, [chatWrapper]);

  // Prune portals whose slot element has been removed from the DOM
  // (e.g. user deleted a mention token via backspace or sent the message).
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

const TokenPortalsContainerExport = React.memo(TokenPortalsContainer);
export { TokenPortalsContainerExport as TokenPortalsContainer };

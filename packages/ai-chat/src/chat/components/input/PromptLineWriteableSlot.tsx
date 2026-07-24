/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef, useState } from "react";

import { WriteableElementName } from "../../../types/instance/WriteableElements";

interface PromptLineWriteableSlotProps {
  /**
   * The writeable element name projected into this slot. Becomes the `<slot>` name that
   * catches host-provided content forwarded down from the chat container.
   */
  slotName: WriteableElementName;

  /**
   * The `prompt-line-shell` slot this wrapper projects into (`message-actions` or
   * `send-control`).
   */
  wrapperSlot: string;
}

/**
 * Returns whether the assigned (flattened) slot content carries anything renderable —
 * an element with children or non-whitespace text. The framework always assigns an empty
 * host `<div>` to these slots, so presence of an assigned node is not enough; we have to
 * look past it for real content.
 */
function hasRenderableContent(slotElement: HTMLSlotElement): boolean {
  return slotElement
    .assignedNodes({ flatten: true })
    .some((node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element).childNodes.length > 0 || !!node.textContent?.trim()
        : !!node.textContent?.trim(),
    );
}

/**
 * A writeable-element catch-slot that lives inside the input composer's flex rows.
 *
 * Unlike the block-stacked writeable elements, an empty wrapper here would occupy a flex
 * track and shift the prompt line / send button. The wrapper is also a
 * `data-floating-menu-container`, so it must stay a real (sized) box when it does have
 * content for Carbon tooltip/popover positioning — ruling out a `display: contents`
 * collapse. So we gate on occupancy: the box renders only while the slot actually has
 * content. Content can arrive through any path (the `renderWriteableElements` portal, the
 * imperative `instance.writeableElements` API, or a web-component `slot=` child), some of
 * which mutate children asynchronously, so we watch both slot assignment (`slotchange`)
 * and the assigned subtree (`MutationObserver`).
 */
function PromptLineWriteableSlot({
  slotName,
  wrapperSlot,
}: PromptLineWriteableSlotProps) {
  const slotRef = useRef<HTMLSlotElement>(null);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const slotElement = slotRef.current;
    if (!slotElement) {
      return undefined;
    }

    const observer = new MutationObserver(() =>
      setHasContent(hasRenderableContent(slotElement)),
    );

    const reevaluate = () => {
      setHasContent(hasRenderableContent(slotElement));
      // Re-target the observer at the current assigned nodes; assignment can change
      // (e.g. a web-component consumer slots content in after mount).
      observer.disconnect();
      slotElement.assignedNodes({ flatten: true }).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          observer.observe(node, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      });
    };

    reevaluate();
    slotElement.addEventListener("slotchange", reevaluate);
    return () => {
      slotElement.removeEventListener("slotchange", reevaluate);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      slot={wrapperSlot}
      data-prompt-line-slot
      data-floating-menu-container
      hidden={!hasContent}
    >
      <slot ref={slotRef} name={slotName} />
    </div>
  );
}

export default React.memo(PromptLineWriteableSlot);

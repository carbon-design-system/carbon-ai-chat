/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Bridges the WC-style `renderUserDefinedInputNode` (returns `HTMLElement`)
 * to the React-style API the underlying `InputNodePortalsContainer`
 * consumes. The WC's HTMLElement is mounted via a ref-attached `<span>` so
 * React keeps ownership of the slot wrapper while the consumer keeps
 * ownership of the chip-body element.
 */

import React, { useEffect, useRef } from "react";

import type {
  RenderUserDefinedInputNode,
  RenderUserDefinedInputNodeState,
  WCRenderUserDefinedInputNode,
} from "../../types/component/ChatContainer";
import type { ChatInstance } from "../../types/instance/ChatInstance";

export function adaptWCRenderUserDefinedInputNode(
  wcRenderer: WCRenderUserDefinedInputNode,
): RenderUserDefinedInputNode {
  // eslint-disable-next-line react/display-name -- this is a render callback, not a component
  return (state, instance) => (
    <WCMount state={state} instance={instance} wcRenderer={wcRenderer} />
  );
}

interface WCMountProps {
  state: RenderUserDefinedInputNodeState;
  instance: ChatInstance;
  wcRenderer: WCRenderUserDefinedInputNode;
}

function WCMount({ state, instance, wcRenderer }: WCMountProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const lastElRef = useRef<HTMLElement | null>(null);

  // Depend on the individual `state` fields, not the wrapper object:
  // `InputNodePortalsContainer` allocates a fresh `{ node, message }` on every
  // render, but `node` / `message` themselves are stable (derived from the
  // memoized `slotEntries`). Keying the effect on the wrapper would tear down
  // and rebuild the consumer's element on every unrelated chat re-render.
  const { node, message } = state;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const el = wcRenderer({ node, message }, instance);
    if (lastElRef.current && lastElRef.current.parentNode === host) {
      host.removeChild(lastElRef.current);
    }
    lastElRef.current = el ?? null;

    if (el) {
      host.appendChild(el);
    }

    return () => {
      if (lastElRef.current && lastElRef.current.parentNode === host) {
        host.removeChild(lastElRef.current);
        lastElRef.current = null;
      }
    };
  }, [node, message, instance, wcRenderer]);

  return <span ref={hostRef} />;
}

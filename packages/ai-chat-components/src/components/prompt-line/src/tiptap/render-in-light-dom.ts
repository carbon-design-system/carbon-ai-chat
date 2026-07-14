/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `renderInLightDom` is the generic light-DOM portal handshake. The chat —
 * including the Tiptap editor — runs inside a shadow root, so a host-authored
 * `addNodeView` cannot reach the page's stylesheet. This helper builds a
 * shadow-side container and dispatches a `cds-aichat-light-dom-portal` event;
 * the chat's portal container catches it, mounts the supplied content into the
 * page's LIGHT DOM, and projects it back into the container via a `<slot>`.
 *
 * `renderTokenChip` is a thin token-specific wrapper over this primitive.
 */

import type { ReactNode } from "react";

/** Wire event for the generic light-DOM portal handshake. */
export const LIGHT_DOM_PORTAL_EVENT = "cds-aichat-light-dom-portal";

export interface RenderInLightDomArgs {
  /**
   * Content to render in the page's light DOM. An `HTMLElement` is appended
   * directly. A `ReactNode` is `createPortal`-ed by the chat's React tree —
   * the same path the token `renderCustomToken` ReactNode case uses; it relies
   * on the host and chat sharing a single React instance.
   */
  content: HTMLElement | ReactNode;
  /**
   * Where to dispatch the handshake event. A host `addNodeView` should pass
   * `editor.view.dom` so the event reaches the listener on the chat wrapper.
   * Defaults to the returned `container` (the event bubbles and is composed).
   */
  dispatchTarget?: EventTarget;
  /**
   * Optional element shown inside the `<slot>` until the portal commits on the
   * next frame.
   */
  fallback?: HTMLElement;
  /**
   * Opaque metadata forwarded verbatim in the event detail. The portal
   * container does not read it; listeners may.
   */
  meta?: Record<string, unknown>;
  /**
   * Tag used for the shadow-side container AND the page-light-DOM host
   * element the portal creates. Defaults to `"span"`, which suits inline
   * content like a token chip. Use `"div"` when the projected content is
   * block-level (e.g. an atom-block Tiptap node containing a
   * `<cds-aichat-code-snippet>`) — a `<span>` wrapper would otherwise wrap a
   * `display: block` child in an inline line-box, adding the parent's
   * line-height as phantom leading.
   */
  containerTag?: "span" | "div";
}

export interface RenderInLightDomResult {
  /**
   * The shadow-side container. Place it where the content should appear (e.g.
   * return it as a Tiptap node view `dom`). The portal container injects a
   * `<slot>` into it that projects the light-DOM content into position.
   */
  container: HTMLElement;
}

/**
 * Detail payload for {@link LIGHT_DOM_PORTAL_EVENT}. Exactly one of
 * `htmlElement` / `reactNode` is set.
 */
export interface LightDomPortalEventDetail {
  /** Shadow-side container the listener injects a `<slot>` into. */
  container: HTMLElement;
  /** Optional `<slot>` fallback content. */
  fallback?: HTMLElement;
  /** Opaque caller metadata. */
  meta?: Record<string, unknown>;
  /** Set when the caller passed an `HTMLElement`. */
  htmlElement?: HTMLElement;
  /** Set when the caller passed a `ReactNode`. */
  reactNode?: ReactNode;
  /** Tag the listener should use for the page-light-DOM `slot` host element. */
  hostTag?: "span" | "div";
}

/**
 * Bridge `content` into the page's light DOM via the slot-projection portal.
 * Returns the shadow-side `container` to place where the content belongs.
 */
export function renderInLightDom(
  args: RenderInLightDomArgs,
): RenderInLightDomResult {
  const containerTag = args.containerTag ?? "span";
  const container = document.createElement(containerTag);
  container.className = "cds-aichat--light-dom-portal-container";

  const detail: LightDomPortalEventDetail = {
    container,
    fallback: args.fallback,
    meta: args.meta,
    hostTag: containerTag,
    ...(args.content instanceof HTMLElement
      ? { htmlElement: args.content }
      : { reactNode: args.content }),
  };

  const event = new CustomEvent<LightDomPortalEventDetail>(
    LIGHT_DOM_PORTAL_EVENT,
    { detail, bubbles: true, composed: true },
  );

  (args.dispatchTarget ?? container).dispatchEvent(event);

  return { container };
}

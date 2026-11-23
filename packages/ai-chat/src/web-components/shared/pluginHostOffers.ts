/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * True when a `cds-aichat-markdown-plugin-host-mount` offer comes from the
 * chat's own content: from inside `container`'s shadow tree, or dispatched on
 * `container` itself, as the chat does for rich user-message nodes. An offer
 * dispatched on `surface`, the element asking, also counts, as it always has.
 *
 * False for content a host app renders into the chat, such as markdown in a
 * user-defined response. That content sits in a chat element's light DOM, so it
 * is already where page CSS reaches. If the chat claims its host, the host
 * leaves the markdown element, and the element's slot forwarder sits in a tree
 * that can't project it, so nothing shows.
 *
 * The composed path can't tell the two apart: slotted content's path also runs
 * through `container`'s shadow root, by way of the slot it is assigned to. So
 * this walks the shadow-including ancestry of the node that dispatched the
 * offer instead.
 *
 * @param event The mount offer, as the listener on `surface` receives it.
 * @param surface The chat element whose listener is asking.
 * @param container The `cds-aichat-container` whose shadow root holds the
 * chat's own content: `surface` itself, or for `cds-aichat-custom-element`,
 * the container inside its shadow root.
 */
export function isChatContentOffer(
  event: Event,
  surface: Element,
  container: Element | null | undefined = surface
): boolean {
  const [origin] = event.composedPath();
  if (origin === surface) {
    return true;
  }
  const shadowRoot = container?.shadowRoot;
  if (!shadowRoot) {
    return false;
  }
  let node = origin instanceof Node ? origin : null;
  while (node) {
    if (node === container) {
      return true;
    }
    const root = node.getRootNode();
    if (root === shadowRoot) {
      return true;
    }
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return false;
}

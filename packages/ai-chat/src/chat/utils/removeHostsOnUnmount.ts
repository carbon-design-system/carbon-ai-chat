/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** Nodes the chat put in an element's light DOM through {@link placeHosts}. */
const placedHosts = new WeakSet<Node>();

/**
 * Inserts `hosts`, in order, after the nodes the chat placed in `wrapper`
 * earlier and ahead of everything else, which belongs to the page. A Lit
 * template that renders into `wrapper` clears only the nodes after its own
 * markers, so hosts placed ahead of them survive its re-renders. Appending
 * would put them after a trailing part's marker, where clearing that part
 * removes them.
 */
export function placeHosts(wrapper: HTMLElement, hosts: HTMLElement[]): void {
  let before = wrapper.firstChild;
  while (before && placedHosts.has(before)) {
    before = before.nextSibling;
  }
  hosts.forEach((host) => {
    placedHosts.add(host);
    wrapper.insertBefore(host, before);
  });
}

export function attachHosts(
  hosts: Map<string, HTMLElement>,
  chatWrapper: HTMLElement | undefined
): void {
  if (chatWrapper) {
    placeHosts(
      chatWrapper,
      [...hosts.values()].filter((host) => !host.isConnected)
    );
  }
}

export function detachHosts(hosts: Map<string, HTMLElement>): void {
  hosts.forEach((host) => host.remove());
}

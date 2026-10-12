/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export function attachHosts(
  hosts: Map<string, HTMLElement>,
  chatWrapper: HTMLElement | undefined
): void {
  hosts.forEach((host) => {
    if (!host.isConnected) {
      chatWrapper?.appendChild(host);
    }
  });
}

export function detachHosts(hosts: Map<string, HTMLElement>): void {
  hosts.forEach((host) => host.remove());
}

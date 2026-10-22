/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type { Page } from '@playwright/test';

export async function inspectUpgrades(page: Page) {
  return page.evaluate(async () => {
    const walk = (root: Document | ShadowRoot): HTMLElement[] =>
      Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap((element) => [
        element,
        ...(element.shadowRoot ? walk(element.shadowRoot) : []),
      ]);
    const deadline = Date.now() + 5000;
    for (let pass = 0; pass < 3; pass++) {
      const elements = walk(document);
      for (const element of elements) {
        const update = (
          element as HTMLElement & { updateComplete?: Promise<boolean> }
        ).updateComplete;
        if (update) {
          let timer: ReturnType<typeof setTimeout>;
          await Promise.race([
            update,
            new Promise((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(`Lit update timed out: ${element.localName}`)
                  ),
                Math.max(0, deadline - Date.now())
              );
            }),
          ]).finally(() => clearTimeout(timer));
        }
      }
    }
    const tags = walk(document).filter((element) =>
      element.localName.startsWith('cds-')
    );
    return {
      tags: [...new Set(tags.map((element) => element.localName))],
      failures: tags.flatMap((element) => {
        const constructor = customElements.get(element.localName);
        return constructor && element instanceof constructor
          ? []
          : [element.localName];
      }),
    };
  });
}

export function focusedTag(page: Page) {
  return page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    let node = active;
    while (node) {
      if (node.localName.includes('menu-item')) {
        return node.getAttribute('label');
      }
      const root = node.getRootNode();
      node = root instanceof ShadowRoot ? root.host : null;
    }
    return active?.localName ?? null;
  });
}

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** Includes direct web-component slots as well as content in the stable host. */
export function getWriteableElementContent(
  node: HTMLElement | undefined
): Node[] {
  if (!node) {
    return [];
  }
  const content: Node[] = Array.from(node.childNodes);
  if (node.slot && node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling !== node && sibling.getAttribute('slot') === node.slot) {
        content.push(
          ...(sibling instanceof HTMLSlotElement
            ? sibling.assignedNodes({ flatten: true })
            : [sibling])
        );
      }
    }
  }
  return content;
}

export function hasMeaningfulContent(node: HTMLElement | undefined): boolean {
  return getWriteableElementContent(node).some((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return Boolean(child.textContent?.trim());
    }
    return child.nodeType === Node.ELEMENT_NODE;
  });
}

/*
 *  Copyright IBM Corp. 2025, 2026
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

export function observeWriteableElementPresence(
  node: HTMLElement | undefined,
  onChange: (present: boolean) => void
): () => void {
  onChange(hasMeaningfulContent(node));
  if (!node) {
    return () => {};
  }
  let connected = true;
  const update = () => {
    if (connected) {
      onChange(hasMeaningfulContent(node));
    }
  };
  const observer = new MutationObserver(update);
  const target = node.parentElement ?? node;
  observer.observe(target, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['slot'],
  });
  target.addEventListener('slotchange', update);
  return () => {
    connected = false;
    observer.disconnect();
    target.removeEventListener('slotchange', update);
  };
}

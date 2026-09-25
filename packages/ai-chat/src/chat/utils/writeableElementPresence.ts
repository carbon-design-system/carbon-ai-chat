/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export function hasMeaningfulContent(node: HTMLElement | undefined): boolean {
  return Boolean(
    node &&
    Array.from(node.childNodes).some((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return Boolean(child.textContent?.trim());
      }
      return child.nodeType === Node.ELEMENT_NODE;
    })
  );
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
  const observer = new MutationObserver(() => {
    if (connected) {
      onChange(hasMeaningfulContent(node));
    }
  });
  observer.observe(node, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  return () => {
    connected = false;
    observer.disconnect();
  };
}

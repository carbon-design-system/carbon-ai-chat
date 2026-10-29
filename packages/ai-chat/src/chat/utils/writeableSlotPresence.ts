/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

function hasRenderableSlotContent(slot: HTMLSlotElement): boolean {
  return slot
    .assignedNodes({ flatten: true })
    .some((node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? node.childNodes.length > 0 || Boolean(node.textContent?.trim())
        : Boolean(node.textContent?.trim())
    );
}

function observeWriteableSlotPresence(
  slot: HTMLSlotElement,
  onChange: (present: boolean) => void
): () => void {
  let connected = true;
  const update = () => {
    if (connected) {
      onChange(hasRenderableSlotContent(slot));
    }
  };
  const observer = new MutationObserver(update);
  const reevaluate = () => {
    update();
    observer.disconnect();
    slot.assignedNodes({ flatten: true }).forEach((node) => {
      if (
        node.nodeType === Node.ELEMENT_NODE ||
        node.nodeType === Node.TEXT_NODE
      ) {
        observer.observe(node, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    });
  };
  reevaluate();
  slot.addEventListener('slotchange', reevaluate);
  return () => {
    connected = false;
    slot.removeEventListener('slotchange', reevaluate);
    observer.disconnect();
  };
}

export { observeWriteableSlotPresence };

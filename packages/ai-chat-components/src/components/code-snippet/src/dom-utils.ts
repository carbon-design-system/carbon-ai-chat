/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Observes resize of the given element with the provided resize observer.
 * Returns an object with a release() method to clean up the observer.
 */
export const observeResize = (
  observer: ResizeObserver,
  elem: Element,
): { release(): null } | null => {
  if (!elem) {
    return null;
  }
  observer.observe(elem);
  return {
    release() {
      observer.unobserve(elem);
      return null;
    },
  };
};

/**
 * Gets scroll and dimension information from a code reference element.
 */
export function getCodeRefDimensions(ref: Element) {
  const {
    clientWidth: codeClientWidth,
    scrollLeft: codeScrollLeft,
    scrollWidth: codeScrollWidth,
  } = ref as HTMLElement;

  return {
    horizontalOverflow: codeScrollWidth > codeClientWidth,
    codeClientWidth,
    codeScrollWidth,
    codeScrollLeft,
  };
}

/**
 * Extracts text content from child nodes of an element without trimming so callers can decide how to normalize whitespace.
 */
export function extractTextContent(element: Element): string {
  const textContent = Array.from(element.childNodes)
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE,
    )
    .map((node) => node.textContent || "")
    .join("");

  return textContent;
}

/**
 * Extracts text content from a slot's assigned nodes without trimming so streaming whitespace is preserved.
 */
export function extractSlotContent(slot: HTMLSlotElement): string {
  const nodes = slot.assignedNodes({ flatten: true });
  return nodes.map((node) => node.textContent || "").join("");
}

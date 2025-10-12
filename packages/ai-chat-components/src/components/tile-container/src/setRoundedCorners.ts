/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Traverses the DOM inside a container and applies border radius
 * to elements that touch the container’s edges.
 *
 * @param container The container element to analyze
 * @param tolerancePx Pixel tolerance for "touching" edges
 * @param deep Whether to traverse into shadow DOMs
 */
export default function setRoundedCorners(
  container: HTMLElement,
  tolerancePx = 1,
  deep = true,
): MutationObserver | void {
  if (!container || container.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );

  const updateEdges = () => {
    const containerStyle = getComputedStyle(container);
    const radiusPx = parseFloat(containerStyle.borderRadius) || 0;
    const elements: HTMLElement[] = [];

    const crawl = (node: Element) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const el = node as HTMLElement;
      const style = getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity) === 0
      ) {
        return;
      }

      elements.push(el);

      for (const child of el.children) {
        crawl(child);
      }
      if (deep && el.shadowRoot) {
        for (const child of el.shadowRoot.children) {
          crawl(child);
        }
      }
    };

    crawl(container);

    const containerRect = container.getBoundingClientRect();
    const borderTop = parseFloat(containerStyle.borderTopWidth) || 0;
    const borderRight = parseFloat(containerStyle.borderRightWidth) || 0;
    const borderBottom = parseFloat(containerStyle.borderBottomWidth) || 0;
    const borderLeft = parseFloat(containerStyle.borderLeftWidth) || 0;
    const borderMax = Math.max(
      borderTop,
      borderRight,
      borderBottom,
      borderLeft,
    );

    const innerRadiusPx = Math.max(radiusPx - borderMax, 0);
    const innerRadiusRem = innerRadiusPx / rootFontSize;

    const rects = elements.map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
    }));

    for (const { el, rect } of rects) {
      if (el === container) {
        continue;
      }

      const touchTop = Math.abs(rect.top - containerRect.top) <= tolerancePx;
      const touchBottom =
        Math.abs(rect.bottom - containerRect.bottom) <= tolerancePx;
      const touchLeft = Math.abs(rect.left - containerRect.left) <= tolerancePx;
      const touchRight =
        Math.abs(rect.right - containerRect.right) <= tolerancePx;

      const roundTL = touchTop && touchLeft;
      const roundTR = touchTop && touchRight;
      const roundBL = touchBottom && touchLeft;
      const roundBR = touchBottom && touchRight;

      if (roundTL || roundTR || roundBL || roundBR) {
        const borderRadius = `${roundTL ? `${innerRadiusRem}rem` : "0"} ${
          roundTR ? `${innerRadiusRem}rem` : "0"
        } ${roundBR ? `${innerRadiusRem}rem` : "0"} ${
          roundBL ? `${innerRadiusRem}rem` : "0"
        }`;
        el.style.setProperty("border-radius", borderRadius);
      } else {
        el.style.removeProperty("border-radius");
      }
    }
  };

  // Initial run
  updateEdges();

  // Debounce mutation observer updates using rAF
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        updateEdges();
        scheduled = false;
      });
    }
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  return observer;
}

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { compute } from "compute-scroll-into-view";
import { memoizeFunction } from "./memoizerUtils";
import { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { tabbable } from "tabbable";

/**
 * The calculated size of scrollbars in the application. Note that this value can vary by browser and operating
 * system. This is memoized so it's calculated lazily after the application has loaded.
 */
const SCROLLBAR_WIDTH = memoizeFunction(getScrollbarWidth);

/**
 * Scrolls the given element into view if necessary.
 *
 * @param element The element to scroll.
 * @param animate Indicates if the scroll should be animated.
 * @param boundary An optional boundary element that tells the computation code where to stop when trying to find a
 * scrollable container.
 */
function doScrollElementIntoView(
  element: Element,
  animate = false,
  boundary?: Element,
) {
  if (element) {
    const actions = compute(element, {
      boundary,
      scrollMode: "if-needed",
      block: "nearest",
      inline: "nearest",
    });

    actions.forEach(({ el, top, left }) => {
      // noinspection JSSuspiciousNameCombination
      doScrollElement(el, Math.round(top), Math.round(left), animate);
    });
  }
}

/**
 * Sets the scroll position on the given scrollable element to the given top and left values.
 *
 * @param element The scrollable element to set the scroll position of.
 * @param scrollTop The scrollTop value to set.
 * @param scrollLeft The scrollLeft value to set.
 * @param animate Indicates if the scrolling should be done using animation.
 */
function doScrollElement(
  element: Element,
  scrollTop: number,
  scrollLeft: number,
  animate = false,
) {
  setTimeout(() => {
    if (element) {
      if (animate && element.scroll) {
        element.scroll({
          top: scrollTop,
          left: scrollLeft,
          behavior: "smooth",
        });
      } else {
        element.scrollTop = scrollTop;
        element.scrollLeft = scrollLeft;
      }
    }
  });
}

/**
 * Calculates the width of a scrollbar in the system. This will add a temporary scrollable div to the document with
 * a div inside and then measure the difference in size of the element.
 */
function getScrollbarWidth(): number {
  // Creating invisible container
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container.
  const inner = document.createElement("div");
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width.
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Removing temporary elements from the DOM.
  outer.parentNode.removeChild(outer);

  return scrollbarWidth;
}

/**
 * Requests focus be moved to the given element, optionally deferring it to the next event loop.
 *
 * @param element The element to move focus to.
 * @param preventScroll Indicates if scrolling should be prevented as a result of the focus change.
 */
function doFocus(element: HTMLElement | SVGElement, preventScroll = false) {
  if (
    element &&
    document.activeElement !== element &&
    tabbable(element, { getShadowRoot: true })
  ) {
    element.focus({ preventScroll });
  }
}

/**
 * Requests focus be moved to the element referenced by the given react ref if the referenced element is defined.
 *
 * @param ref The reference to the element to move focus to.
 * @param defer Indicates if the focus should be executed now or if it should be deferred to another event loop.
 * @param preventScroll Indicates if scrolling should be prevented as a result of the focus change.
 */
function doFocusRef(
  ref: RefObject<HTMLElement | null>,
  defer = false,
  preventScroll = false,
) {
  if (ref) {
    if (defer) {
      setTimeout(() => {
        doFocusRef(ref);
      });
    } else if (ref.current) {
      doFocus(ref.current, preventScroll);
    }
  }
}

/**
 * Determines if the given node is an Element.
 */
function isElement(node: Node): node is Element {
  return node?.nodeType === 1;
}

/**
 * Determines if the given node is a Text node.
 */
function isTextNode(node: Node): node is Text {
  return node?.nodeType === 3;
}

/**
 * Determines if the given node is a INPUT html element.
 */
function isInputNode(node: Node): node is HTMLInputElement {
  return (node as Element)?.tagName === "INPUT";
}

/**
 * Determines if the given node is an IMG html element.
 */
function isImageNode(node: Node): node is HTMLImageElement {
  return (node as Element)?.tagName === "IMG";
}

/**
 * Determines if the given node is a TEXTAREA html element.
 */
function isTextAreaNode(node: Node): node is HTMLTextAreaElement {
  return (node as Element)?.tagName === "TEXTAREA";
}

/**
 * Looks through an array of elements for the first child element that should receive focus.
 * If no elements should receive focus, returns false.
 *
 * @param elements An array of HTMLElements.
 *
 * @returns boolean explaining if there was a focusable element or not.
 */
function focusOnFirstFocusableItemInArrayOfElements(
  elements: HTMLElement[],
): boolean {
  for (let index = 0; index < elements.length; index++) {
    if (focusOnFirstFocusableElement(elements[index])) {
      return true;
    }
  }
  return false;
}

/**
 * Searches through the children of an element for an element to focus on. The first child that can get focus that is
 * found will receive focus. If no elements are found, returns false.
 *
 * @param parentElement An element with potential focusable children.
 */
function focusOnFirstFocusableElement(parentElement: HTMLElement) {
  const focusableElements = tabbable(parentElement, { getShadowRoot: true });
  if (focusableElements?.length) {
    doFocus(focusableElements[0]);
    return true;
  }
  return false;
}

/**
 * Determines if the given keyboard event represent a press of the enter key. This will exclude the key when pressed
 * as part of IME composing and it will also exclude the key if there are any modifier keys that are pressed at the same
 * time. This function supports both the built-in typescript KeyboardEvent type and the React version (which is
 * missing some properties).
 */
function isEnterKey(event: ReactKeyboardEvent | KeyboardEvent) {
  if (event.key === "Enter" && !hasModifiers(event)) {
    // Users using IMEs could be making a word selection when they hit enter. This check will prevent the user’s
    // message from being sent prematurely.
    return !((event as KeyboardEvent).isComposing || event.keyCode === 229);
  }
  return false;
}

/**
 * Determines if the given keyboard event has any modifier keys pressed.
 */
function hasModifiers(event: ReactKeyboardEvent | KeyboardEvent) {
  return event.shiftKey || event.altKey || event.metaKey || event.ctrlKey;
}

/**
 * Returns the "scrollBottom" value for the given element. This is similar to "scrollTop" except that it represents
 * the distance the element has been scrolled from the bottom.
 */
function getScrollBottom(element: HTMLElement) {
  if (element) {
    return element.scrollHeight - element.offsetHeight - element.scrollTop;
  }
  return 0;
}

/**
 * Continuously checks an element's scrollHeight on each animation frame and resolves
 * once the scrollHeight remains unchanged for a specified number of consecutive frames (default 2 frames).
 *
 * This is useful for waiting until layout changes (e.g., animations, content loading, dropdowns expanding/collapsing)
 * have fully settled before performing measurements or scroll adjustments.
 *
 * Uses scrollHeight instead of clientHeight/getBoundingClientRect to detect content changes inside scrollable containers.
 */
function waitForStableHeight(
  el: HTMLElement,
  opts: { frames?: number; timeoutMs?: number } = {},
): Promise<void> {
  const requiredStableFrames = opts.frames ?? 2;
  const timeoutMs = opts.timeoutMs ?? 500;
  let stableFrames = 0;
  let lastHeight = el.scrollHeight;
  let rafId: number | null = null;

  return new Promise((resolve) => {
    const deadline = performance.now() + timeoutMs;

    const tick = () => {
      const now = performance.now();
      const h = el.scrollHeight;

      if (h === lastHeight) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastHeight = h;
      }

      if (stableFrames >= requiredStableFrames || now >= deadline) {
        if (rafId != null) {
          cancelAnimationFrame(rafId);
        }
        resolve();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
  });
}

export {
  SCROLLBAR_WIDTH,
  doScrollElement,
  doScrollElementIntoView,
  doFocusRef,
  isElement,
  isTextNode,
  isInputNode,
  isTextAreaNode,
  isImageNode,
  focusOnFirstFocusableItemInArrayOfElements,
  focusOnFirstFocusableElement,
  isEnterKey,
  getScrollBottom,
  waitForStableHeight,
};

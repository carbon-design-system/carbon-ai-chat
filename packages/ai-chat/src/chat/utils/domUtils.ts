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
 * @param animate Indicates if the scrolling should be done using smooth scroll animation.
 */
function doScrollElement(
  element: Element,
  scrollTop: number,
  scrollLeft: number,
  animate = false,
) {
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
    getDeepActiveElement() !== element &&
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
 * Gets the deepest active element, traversing through all shadow DOM boundaries.
 * This handles nested shadow roots, slotted elements, and will return the actual
 * focused element regardless of how many shadow DOM levels exist.
 *
 * @returns The deepest active element, or null if no element has focus
 */
function getDeepActiveElement(): Element | null {
  let activeElement = document.activeElement;

  // Traverse through all shadow DOM levels and handle slotted elements
  while (activeElement) {
    // If the active element is a slot, get the actual assigned element that has focus
    if (activeElement instanceof HTMLSlotElement) {
      const assignedElements = activeElement.assignedElements({
        flatten: true,
      });
      // Find which assigned element actually has focus
      const focusedAssigned = assignedElements.find((el) => {
        if ((el as any).shadowRoot?.activeElement) {
          return true;
        }
        return (
          el === document.activeElement || el.contains(document.activeElement)
        );
      });
      if (focusedAssigned) {
        activeElement = focusedAssigned;
        continue;
      }
    }

    // Check if there's a shadow root with an active element
    const shadowRoot = (activeElement as any).shadowRoot;
    if (shadowRoot?.activeElement) {
      activeElement = shadowRoot.activeElement;
      continue;
    }

    // No deeper level found
    break;
  }

  return activeElement;
}

/**
 * Determines if the given node is an HTMLSlotElement.
 * Slot elements are used in shadow DOM to distribute content from the light DOM.
 */
function isSlotElement(node: Node): node is HTMLSlotElement {
  return node.nodeName === "SLOT";
}

// The set of types for an INPUT node that we want to announce the value of.
const ANNOUNCE_INPUT_TYPES = new Set([
  "button",
  "date",
  "datetime-local",
  "email",
  "file",
  "month",
  "number",
  "range",
  "reset",
  "search",
  "submit",
  "tel",
  "text",
  "time",
  "url",
  "week",
]);

const ANNOUNCE_NODE_EXCLUDE_ATTRIBUTE = "data-cds-aichat-exclude-node-read";

/**
 * Converts the given node into text by extracting all of the text content from it and any children inside of it.
 * Any resulting pieces of text will be added to the given array.
 *
 * This function is used by the AriaAnnouncerComponent to convert DOM nodes into text that can be announced
 * by screen readers. It handles various node types including elements, text nodes, slots, and shadow DOM.
 */
function nodeToText(node: Node, strings: string[]) {
  if (isElement(node)) {
    if (
      (typeof window === "undefined" ||
        window.getComputedStyle(node).display !== "none") &&
      node.getAttribute("aria-hidden") !== "true" &&
      !node.hasAttribute(ANNOUNCE_NODE_EXCLUDE_ATTRIBUTE) &&
      node.tagName !== "BUTTON" &&
      node.getAttribute("role") !== "button"
    ) {
      trimAndPush(node.getAttribute("aria-label"), strings);

      if (
        isInputNode(node) &&
        ANNOUNCE_INPUT_TYPES.has(node.type.toLowerCase())
      ) {
        // If the node has a value, announce that. Otherwise announce any placeholder text.
        if (node.value === "") {
          trimAndPush(node.placeholder, strings);
        } else {
          trimAndPush(node.value, strings);
        }
      } else if (isTextAreaNode(node)) {
        // For text areas, the value is built from children so we don't need to add the value to the strings here.
        // The children will get added below.
        if (node.value === "") {
          trimAndPush(node.placeholder, strings);
        }
      } else if (isImageNode(node)) {
        trimAndPush(node.alt, strings);
      }

      // Handle slot elements specially to access their assigned (slotted) content.
      // Slot elements distribute content from the light DOM into the shadow DOM, but their childNodes
      // only contain fallback content. We need to use assignedNodes() to get the actual slotted content.
      if (isSlotElement(node)) {
        // Check if the slot's parent element has aria-hidden="true"
        // This prevents double-reading when components use hidden slots to hold source content
        // while displaying rendered content elsewhere (e.g., cds-aichat-markdown)
        const parent = node.parentElement;
        if (parent && parent.getAttribute("aria-hidden") === "true") {
          // Skip processing this slot entirely since its parent is marked as hidden
          return;
        }

        // Get assigned nodes with flatten: true to handle nested slots correctly
        const assignedNodes = node.assignedNodes({ flatten: true });

        if (assignedNodes.length > 0) {
          // Process the assigned (slotted) content instead of the slot's fallback content
          assignedNodes.forEach((assignedNode) => {
            nodeToText(assignedNode, strings);
          });
          // Return early to avoid processing the slot's fallback content
          return;
        }
        // If no assigned nodes, fall through to process the slot's fallback content below
      }

      // Recursively go through all of the children.
      // If the element has a shadow root, only process shadow DOM children.
      // Light DOM children (childNodes) will be processed through their corresponding slots in the shadow DOM.
      // This prevents double-reading of slotted content and respects aria-hidden on slot containers.
      if (node.shadowRoot) {
        node.shadowRoot.childNodes?.forEach((childNode) => {
          nodeToText(childNode, strings);
        });
      } else if (node.childNodes) {
        // Only process direct children if there's no shadow root
        node.childNodes.forEach((childNode) => {
          nodeToText(childNode, strings);
        });
      }
    }
  } else if (isTextNode(node)) {
    trimAndPush(node.data, strings);
  }
}

/**
 * Trims the given value and pushes it on to the given array assuming it has any content.
 */
function trimAndPush(value: string, strings: string[]) {
  if (value) {
    value = value.trim();
    if (value) {
      strings.push(value.replaceAll("\n", " "));
    }
  }
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
  isSlotElement,
  focusOnFirstFocusableItemInArrayOfElements,
  focusOnFirstFocusableElement,
  isEnterKey,
  getScrollBottom,
  getDeepActiveElement,
  nodeToText,
};

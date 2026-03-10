/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Checks if an element should be ignored due to visibility or accessibility attributes.
 *
 * @param element - The DOM element to check
 * @param exceptions - Array of selectors to ignore when checking the element (e.g., 'dialog', '[popover]')
 * @returns True if the element should be ignored by focus management, false otherwise
 */
function isElementInvisible(
  element: Element,
  exceptions: string[] = ["dialog", "[popover]"],
): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (exceptions.length > 0 && element.matches(exceptions.join(","))) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  const isStyleHidden =
    computedStyle.display === "none" || computedStyle.visibility === "hidden";
  const isAttributeHidden = element.matches(
    '[disabled], [hidden], [inert], [aria-hidden="true"]',
  );

  return isStyleHidden || isAttributeHidden;
}

/**
 * Checks if an element is focusable. An element is considered focusable if it matches
 * standard focusable elements criteria (such as buttons, inputs, etc., that are not disabled
 * and do not have a negative tabindex) or is a custom element with a shadow root that delegates focus.
 * Based on https://gist.github.com/oscarmarina/9ce95f491a4c53ed01d989de4a87c0c9
 *
 * @param element - The DOM element to check for focusability
 * @returns True if the element is focusable, false otherwise
 */
function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  // https://stackoverflow.com/a/30753870/76472
  const knownFocusableElements =
    'a[href],area[href],button:not([disabled]),details,iframe,object,input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contentEditable="true"],[tabindex]:not([tabindex^="-"])';

  if (element.matches(knownFocusableElements)) {
    return true;
  }

  const isDisabledCustomElement =
    element.localName.includes("-") &&
    element.matches('[disabled], [aria-disabled="true"]');

  if (isDisabledCustomElement) {
    return false;
  }

  return element.shadowRoot?.delegatesFocus ?? false;
}

/**
 * Attempts to focus an element if it's focusable, visible, and not disabled.
 * This is an enhanced version that checks visibility, accessibility attributes,
 * and proper focusability before attempting to set focus.
 *
 * @param element - The element to attempt to focus
 * @param exceptions - Array of selectors to ignore when checking visibility (e.g., 'dialog', '[popover]')
 * @returns True if focus was successfully set, false otherwise
 */
function tryFocus(
  element: Element | null | undefined,
  exceptions?: string[],
): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  // Check if element is invisible or should be ignored
  if (isElementInvisible(element, exceptions)) {
    return false;
  }

  // Check if element is focusable
  if (!isFocusable(element)) {
    return false;
  }

  // Attempt to focus
  const previousActiveElement = document.activeElement;
  element.focus();

  // Verify focus was actually set by checking if activeElement changed
  // This works across shadow DOM boundaries and with delegatesFocus configurations
  return previousActiveElement !== document.activeElement;
}

/**
 * Traverse the composed tree from the root, selecting elements that meet the provided filter criteria.
 * This function properly handles Shadow DOM boundaries.
 * Based on https://github.com/JanMiksovsky/elix/blob/main/src/core/dom.js#L320
 *
 * @param node - The root node for traversal
 * @param whatToShow - NodeFilter code for node types to include (use 0 to retrieve all nodes)
 * @param filter - Filters nodes. Child nodes are considered even if parent does not satisfy the filter
 * @param skipNode - Determines whether to skip a node and its children
 * @returns An iterator yielding nodes meeting the filter criteria
 */
function* walkComposedTree(
  node: Node,
  whatToShow = 0,
  filter: (node: Node) => boolean = () => true,
  skipNode: (node: Node) => boolean = () => false,
): IterableIterator<Node> {
  if ((whatToShow && node.nodeType !== whatToShow) || skipNode(node)) {
    return;
  }

  if (filter(node)) {
    yield node;
  }

  const children =
    // eslint-disable-next-line no-nested-ternary
    node instanceof HTMLElement && node.shadowRoot
      ? node.shadowRoot.children
      : node instanceof HTMLSlotElement
        ? node.assignedNodes({ flatten: true })
        : node.childNodes;

  for (const child of children) {
    yield* walkComposedTree(child, whatToShow, filter, skipNode);
  }
}

/**
 * Retrieves the first and last focusable children of a node using a TreeWalker.
 *
 * @param walker - The TreeWalker object used to traverse the node's children
 * @returns A tuple containing the first and last focusable children. If no focusable children are found, `null` is returned for both
 */
function getFirstAndLastFocusableChildren(
  walker: IterableIterator<HTMLElement>,
): [first: HTMLElement | null, last: HTMLElement | null] {
  let firstFocusableChild: HTMLElement | null = null;
  let lastFocusableChild: HTMLElement | null = null;

  for (const currentNode of walker) {
    if (!firstFocusableChild) {
      firstFocusableChild = currentNode;
    }
    lastFocusableChild = currentNode;
  }

  return [firstFocusableChild, lastFocusableChild];
}

export {
  isElementInvisible,
  isFocusable,
  tryFocus,
  walkComposedTree,
  getFirstAndLastFocusableChildren,
};

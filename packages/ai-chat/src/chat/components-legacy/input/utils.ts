/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

function normalizeTextValue(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDisplayHTML(value: string) {
  const escaped = escapeHTML(value);
  return escaped.replace(/\n/g, "<br>");
}

function getSelectionForElement(element: HTMLElement) {
  // ShadowRoot selection is separate from window selection.
  const root = element.getRootNode();
  if (root) {
    const shadowRoot = root as ShadowRoot & {
      getSelection?: () => Selection | null;
    };
    if (typeof shadowRoot.getSelection === "function") {
      return shadowRoot.getSelection();
    }
  }

  return window.getSelection();
}

function getSelectionRangeForElement(
  element: HTMLElement,
  selection: Selection | null,
) {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (
    range.commonAncestorContainer !== element &&
    !element.contains(range.commonAncestorContainer)
  ) {
    return null;
  }

  return range;
}

function createRangeAtEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  return range;
}

function placeCaretAtEnd(element: HTMLElement, selection: Selection | null) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const range = createRangeAtEnd(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function insertTextAtRange(
  range: Range,
  text: string,
  selection: Selection | null,
) {
  const lines = text.split("\n");
  const fragment = document.createDocumentFragment();
  let lastNode: Node | null = null;

  lines.forEach((line, index) => {
    const textNode = document.createTextNode(line);
    fragment.appendChild(textNode);
    lastNode = textNode;

    if (index < lines.length - 1) {
      const br = document.createElement("br");
      fragment.appendChild(br);
      lastNode = br;
    }
  });

  range.insertNode(fragment);

  if (selection && lastNode) {
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}

/**
 * Validates that a range is within the specified element.
 * Returns the range if valid, null otherwise.
 */
function validateRangeInElement(
  range: Range | null,
  element: HTMLElement,
): Range | null {
  if (!range) {
    return null;
  }

  const isInEditor =
    range.commonAncestorContainer === element ||
    element.contains(range.commonAncestorContainer);

  return isInEditor ? range : null;
}

/**
 * Calculates how many characters can be inserted given the current text,
 * selected text length, and maximum length constraint.
 */
function calculateAvailableLength(
  currentText: string,
  selectedTextLength: number,
  maxLength: number | undefined | null,
): number | undefined {
  if (maxLength === undefined || maxLength === null) {
    return undefined;
  }
  return Math.max(maxLength - (currentText.length - selectedTextLength), 0);
}

/**
 * Truncates text to fit within the specified maximum length.
 */
function truncateToLength(text: string, maxLength: number | undefined): string {
  if (maxLength === undefined) {
    return text;
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/**
 * Updates the data-has-content attribute on an element.
 * This is used by CSS to show/hide the placeholder text.
 */
function updateContentAttribute(element: HTMLElement, value: string): void {
  element.dataset.hasContent = value.trim() ? "true" : "false";
}

/**
 * Gets the current selection range within the specified element.
 */
function getSelectionRange(element: HTMLElement): Range | null {
  const selection = getSelectionForElement(element);
  return getSelectionRangeForElement(element, selection);
}

/**
 * Reads the current text from the DOM, enforces maxLength, and returns the normalized values.
 * If text exceeds maxLength, it truncates and updates the DOM directly.
 */
function extractNormalizedText(
  element: HTMLElement,
  maxLength: number | undefined,
): { rawValue: string; displayValue: string; wasTruncated: boolean } {
  const textValue = normalizeTextValue(element.innerText || "");
  let nextValue = textValue;
  let wasTruncated = false;

  if (maxLength && nextValue.length > maxLength) {
    nextValue = nextValue.slice(0, maxLength);
    element.innerText = nextValue;
    wasTruncated = true;
  }

  return {
    rawValue: nextValue,
    displayValue: toDisplayHTML(nextValue),
    wasTruncated,
  };
}

export {
  calculateAvailableLength,
  createRangeAtEnd,
  escapeHTML,
  extractNormalizedText,
  getSelectionForElement,
  getSelectionRange,
  getSelectionRangeForElement,
  insertTextAtRange,
  normalizeTextValue,
  placeCaretAtEnd,
  toDisplayHTML,
  truncateToLength,
  updateContentAttribute,
  validateRangeInElement,
};

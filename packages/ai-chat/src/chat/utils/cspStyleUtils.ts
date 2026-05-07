/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * CSP-compliant dynamic styling helpers.
 *
 * Writes runtime-dynamic CSS declarations for individual DOM elements via the
 * shared dynamic stylesheet (a Constructable CSSStyleSheet) so a strict CSP
 * can drop `style-src-attr 'unsafe-inline'`. Both `el.style.foo = ...` and
 * `el.style.setProperty(...)` mutate an element's `style` attribute and are
 * blocked by `style-src-attr`; mutations to a CSSStyleSheet that the document
 * already trusts are governed by `style-src` and pass without `'unsafe-inline'`.
 *
 * Each call site picks a `prefix` (e.g. `"avatar"`, `"grid-cell"`) which
 * scopes the per-instance attribute it tags elements with
 * (`data-cds-aichat-${prefix}-id`). IDs are globally unique within a prefix.
 */

import {
  adoptOnRoot,
  clearSelector,
  clearVarsForSelector,
  setVarsForSelector,
} from "@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js";

let instanceCounter = 0;

// Tracks which CSS properties each element currently has set via this helper,
// so we can compute the diff and drop properties that were dropped from the
// declarations on a subsequent call. The shared `setVarsForSelector` is
// intentionally merge-based (multiple subsystems can write disjoint
// properties to the same selector); this helper layers replace semantics on
// top because each per-instance selector is owned by a single caller.
const previousKeysByElement = new WeakMap<HTMLElement, Set<string>>();

function attrNameFor(prefix: string): string {
  return `data-cds-aichat-${prefix}-id`;
}

function escapeForAttributeSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function selectorFor(attrName: string, id: string): string {
  return `[${attrName}="${escapeForAttributeSelector(id)}"]`;
}

/**
 * Apply dynamic CSS declarations to an element via the shared dynamic
 * stylesheet. Tags the element with a stable per-instance data attribute on
 * first call so subsequent updates target the same rule. Adopts the
 * stylesheet on the element's root (document or shadow root) so the rule
 * actually applies inside shadow DOM.
 *
 * Idempotent: calling with the same declarations is a no-op
 * (`setVarsForSelector` short-circuits on unchanged values).
 */
function applyDynamicStyles(
  element: HTMLElement,
  prefix: string,
  declarations: Record<string, string>,
): void {
  const attrName = attrNameFor(prefix);
  let id = element.getAttribute(attrName);
  if (!id) {
    id = `${prefix}-${++instanceCounter}`;
    element.setAttribute(attrName, id);
  }
  const root = element.getRootNode();
  if (root instanceof Document || root instanceof ShadowRoot) {
    adoptOnRoot(root);
  }
  const selector = selectorFor(attrName, id);
  const newKeys = new Set(Object.keys(declarations));
  const previousKeys = previousKeysByElement.get(element);
  if (previousKeys) {
    const toRemove: string[] = [];
    for (const key of previousKeys) {
      if (!newKeys.has(key)) {
        toRemove.push(key);
      }
    }
    if (toRemove.length > 0) {
      clearVarsForSelector(selector, toRemove);
    }
  }
  previousKeysByElement.set(element, newKeys);
  setVarsForSelector(selector, declarations);
}

/**
 * Drop the rule for a previously-styled element. Call this on unmount to
 * avoid accumulating dead rules in the dynamic stylesheet — every write
 * triggers a full sheet rebuild, so unbounded growth would slow updates over
 * the lifetime of a long chat.
 */
function clearDynamicStyles(element: HTMLElement | null, prefix: string): void {
  if (!element) {
    return;
  }
  const attrName = attrNameFor(prefix);
  const id = element.getAttribute(attrName);
  if (!id) {
    return;
  }
  clearSelector(selectorFor(attrName, id));
  previousKeysByElement.delete(element);
}

export { applyDynamicStyles, clearDynamicStyles };

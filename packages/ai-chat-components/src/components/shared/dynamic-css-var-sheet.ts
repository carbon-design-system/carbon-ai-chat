/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Writes runtime-dynamic CSS custom properties via a single Constructable
 * Stylesheet. Lets us update CSS variable values from JS without touching any
 * element's inline `style` attribute, which a strict CSP (no
 * `style-src-attr 'unsafe-inline'`) would block.
 *
 * Why a stylesheet, not `el.style.setProperty`: setProperty mutates the
 * element's `style` attribute and is governed by `style-src-attr`. Mutations
 * to a CSSStyleSheet that the document already trusts are governed by
 * `style-src` and pass without `'unsafe-inline'`.
 *
 * The shared sheet must be adopted on every root (document or shadow root)
 * where its selectors need to apply. Callers in shadow DOM should call
 * `adoptOnRoot(this.getRootNode())` once in `connectedCallback`. Selectors
 * targeting host elements are sufficient: CSS custom properties inherit
 * across the shadow boundary from the host into the shadow tree.
 */

const declarationsBySelector = new Map<string, Map<string, string>>();
const adoptedRoots = new WeakSet<Document | ShadowRoot>();
const fallbackStyleElements = new WeakMap<
  Document | ShadowRoot,
  HTMLStyleElement
>();
const fallbackRoots = new Set<Document | ShadowRoot>();
let sheet: CSSStyleSheet | null = null;

function getCssText(): string {
  return Array.from(declarationsBySelector.entries())
    .map(([selector, declarations]) => {
      const decls = Array.from(declarations.entries())
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(" ");
      return `${selector} { ${decls} }`;
    })
    .join("\n");
}

function ensureSheet(): CSSStyleSheet | null {
  if (sheet) {
    return sheet;
  }
  if (typeof document === "undefined" || typeof CSSStyleSheet === "undefined") {
    return null;
  }
  try {
    const candidate = new CSSStyleSheet();
    if (typeof (candidate as any).replaceSync !== "function") {
      // Older browsers / jsdom may construct a sheet but not implement
      // the constructable-stylesheet write methods. Fall back to <style>.
      return null;
    }
    sheet = candidate;
  } catch {
    return null;
  }
  adoptOnRoot(document);
  return sheet;
}

function ensureFallbackStyleElement(
  root: Document | ShadowRoot,
): HTMLStyleElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const existing = fallbackStyleElements.get(root);
  if (existing) {
    return existing;
  }
  const ownerDocument = root instanceof Document ? root : root.ownerDocument;
  if (!ownerDocument) {
    return null;
  }
  const styleElement = ownerDocument.createElement("style");
  const container =
    root instanceof Document ? (root.head ?? root.documentElement) : root;
  if (!container) {
    return null;
  }
  container.appendChild(styleElement);
  fallbackStyleElements.set(root, styleElement);
  return styleElement;
}

function rewrite(): void {
  const cssText = getCssText();
  if (sheet) {
    sheet.replaceSync(cssText);
  }
  for (const root of fallbackRoots) {
    fallbackStyleElements.get(root)!.textContent = cssText;
  }
}

/**
 * Adopt the shared dynamic stylesheet on a root so its rules apply within
 * that tree. Idempotent per root: subsequent calls for the same root are a
 * no-op so we don't spuriously create a fallback `<style>` element on top of
 * an already-adopted CSSStyleSheet (which trips strict CSP).
 */
function adoptOnRoot(root: Document | ShadowRoot): void {
  if (adoptedRoots.has(root)) {
    return;
  }
  const s = ensureSheet();
  if (s) {
    // Some environments (older browsers, jsdom) don't implement
    // adoptedStyleSheets; fall back to a <style> element in that case.
    const current = (root as any).adoptedStyleSheets;
    if (
      Array.isArray(current) ||
      typeof current?.[Symbol.iterator] === "function"
    ) {
      root.adoptedStyleSheets = [...current, s];
      adoptedRoots.add(root);
      return;
    }
  }
  const fallbackStyleElement = ensureFallbackStyleElement(root);
  if (fallbackStyleElement) {
    fallbackStyleElement.textContent = getCssText();
    fallbackRoots.add(root);
    adoptedRoots.add(root);
  }
}

/**
 * Merge CSS declarations into the rule for a selector. Multiple subsystems
 * can write disjoint properties for the same selector without clobbering
 * each other; existing properties are updated, new ones appended.
 *
 * The keys can be CSS custom properties (e.g. `--cds-aichat-foo`) or any
 * regular CSS property (`display`, `transform`, …).
 */
function setVarsForSelector(
  selector: string,
  vars: Record<string, string>,
): void {
  if (!ensureSheet()) {
    return;
  }
  const existing = declarationsBySelector.get(selector) ?? new Map();
  let changed = false;
  for (const [prop, value] of Object.entries(vars)) {
    if (existing.get(prop) !== value) {
      existing.set(prop, value);
      changed = true;
    }
  }
  if (!changed) {
    return;
  }
  declarationsBySelector.set(selector, existing);
  rewrite();
}

/**
 * Remove the entire rule for a selector.
 */
function clearSelector(selector: string): void {
  if (!declarationsBySelector.delete(selector)) {
    return;
  }
  rewrite();
}

/**
 * Remove specific properties from a selector's rule, leaving any others
 * intact. If the rule ends up empty, it is dropped.
 */
function clearVarsForSelector(selector: string, props: string[]): void {
  const existing = declarationsBySelector.get(selector);
  if (!existing) {
    return;
  }
  let changed = false;
  for (const prop of props) {
    if (existing.delete(prop)) {
      changed = true;
    }
  }
  if (!changed) {
    return;
  }
  if (existing.size === 0) {
    declarationsBySelector.delete(selector);
  }
  rewrite();
}

export { adoptOnRoot, setVarsForSelector, clearSelector, clearVarsForSelector };

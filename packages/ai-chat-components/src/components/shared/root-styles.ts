/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Rules attached to one root by {@link attachRootStyles}.
 */
interface RootStyles {
  /** Replace the attached rules. A no-op when the text is unchanged. */
  update(cssText: string): void;
  /** Remove the attached rules from the root. */
  detach(): void;
}

/**
 * Attaches CSS rules to one document or shadow root.
 *
 * Uses a constructed stylesheet so the rules pass a strict CSP. The sheet is
 * built from the root's own document, since a sheet from another document
 * can't be adopted. Browsers without constructed-sheet support get a `<style>`
 * element instead.
 *
 * Each call owns its own sheet. Use `dynamic-css-var-sheet.ts` for one sheet
 * shared across roots.
 */
function attachRootStyles(
  root: Document | ShadowRoot,
  cssText: string
): RootStyles {
  const isDocument = root.nodeType === Node.DOCUMENT_NODE;
  const ownerDocument = isDocument
    ? (root as Document)
    : (root.ownerDocument as Document);
  let sheet: CSSStyleSheet | undefined;
  let element: HTMLStyleElement | undefined;

  try {
    const candidate = new ownerDocument.defaultView!.CSSStyleSheet();
    candidate.replaceSync(cssText);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, candidate];
    sheet = candidate;
  } catch {
    element = ownerDocument.createElement('style');
    element.textContent = cssText;
    const container = isDocument
      ? ((root as Document).head ?? (root as Document).documentElement)
      : root;
    container.appendChild(element);
  }

  let current = cssText;
  return {
    update(nextText) {
      if (nextText === current) {
        return;
      }
      current = nextText;
      if (sheet) {
        sheet.replaceSync(nextText);
      } else if (element) {
        element.textContent = nextText;
      }
    },
    detach() {
      if (sheet) {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
          (existing) => existing !== sheet
        );
      }
      element?.remove();
    },
  };
}

export { attachRootStyles, type RootStyles };

/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { setVarsForSelector } from "../../../shared/dynamic-css-var-sheet.js";

const PM_CONTENT_CLASS = "cds-aichat--input-pm-content";
const PM_PHONE_CLASS = "cds-aichat--input-pm-content--phone";
let pmStyleRulesInstalled = false;

function ensurePmContentStyleRules(): void {
  if (pmStyleRulesInstalled) {
    return;
  }
  setVarsForSelector(`.${PM_CONTENT_CLASS}`, {
    border: "none",
    margin: "0",
    background: "transparent",
    color: "var(--cds-text-primary, #161616)",
    outline: "none",
    "white-space": "pre-wrap",
    "word-wrap": "break-word",
    "font-size": "var(--cds-body-01-font-size, 0.875rem)",
    "font-weight": "var(--cds-body-01-font-weight, 400)",
    "letter-spacing": "var(--cds-body-01-letter-spacing, 0.16px)",
    "line-height": "var(--cds-body-01-line-height, 1.42857)",
  });
  // Tiptap renders block content into real <p> tags inside the light-DOM
  // contenteditable. Neutralize the user-agent / host paragraph margin so
  // the prompt line doesn't inflate to whatever the host page styles `p` as.
  setVarsForSelector(`.${PM_CONTENT_CLASS} p`, {
    margin: "0",
    padding: "0",
  });
  setVarsForSelector(`.${PM_PHONE_CLASS}`, {
    "font-size": "var(--cds-body-02-font-size, 1rem)",
    "font-weight": "var(--cds-body-02-font-weight, 400)",
    "letter-spacing": "var(--cds-body-02-letter-spacing, 0)",
    "line-height": "var(--cds-body-02-line-height, 1.5)",
  });
  // Tiptap's Placeholder extension only tags empty textblocks with
  // `is-editor-empty` + `data-placeholder` — the host renders the text. The
  // ::before float/height-0 pair keeps the placeholder in flow without
  // displacing the caret onto a second line. Standard Tiptap pattern.
  setVarsForSelector(
    `.${PM_CONTENT_CLASS} p.is-editor-empty:first-child::before`,
    {
      content: "attr(data-placeholder)",
      color: "var(--cds-text-secondary, #525252)",
      float: "left",
      height: "0",
      "pointer-events": "none",
    },
  );
  pmStyleRulesInstalled = true;
}

/**
 * Apply the editor's intrinsic typography and reset styles to the PM content
 * node. The PM contenteditable lives in light DOM (so `::slotted()` can't
 * reach it from the shell's shadow DOM), so we install a class-based rule
 * on the shared dynamic stylesheet (constructable, document-scoped) and add
 * the corresponding classes to the element. This is CSP-safe: stylesheet
 * mutations are governed by `style-src` (not `style-src-attr`) and don't
 * require `'unsafe-inline'`.
 */
export function applyEditorStyles(pmDom: HTMLElement, isPhone: boolean): void {
  ensurePmContentStyleRules();
  pmDom.classList.add(PM_CONTENT_CLASS);
  pmDom.classList.toggle(PM_PHONE_CLASS, isPhone);
}

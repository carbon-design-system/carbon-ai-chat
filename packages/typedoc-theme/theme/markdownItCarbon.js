/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * markdown-it renderer-rule overrides that emit Carbon web components instead of
 * plain HTML for the constructs authored in Markdown (project documents and the
 * prose/examples inside TSDoc comments):
 *
 *   - GFM tables  -> cds-table + cds-table-* children
 *   - fenced code -> cds-aichat-code-snippet (raw source slotted; CodeMirror highlights)
 *   - lists       -> cds-ordered-list / cds-unordered-list / cds-list-item
 *
 * This is wired onto TypeDoc's single shared markdown-it instance via the
 * `markdownItLoader` option (see carbonThemePlugin.js), so it covers every place
 * Markdown is rendered. Auto-generated API reference lists (tsd-parameter-list, etc.)
 * are JSX-rendered, not Markdown, so they are intentionally untouched here.
 */

function escapeText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function applyCarbonRules(parser) {
  const rules = parser.renderer.rules;

  // Tables. cds-table requires its own child elements; it does not accept
  // thead/tbody/tr/th/td. markdown-it emits all thead tokens before tbody in
  // document order, so a single flag distinguishes header rows from body rows.
  let inHead = false;

  rules.table_open = () => "<cds-table>";
  rules.table_close = () => "</cds-table>";
  rules.thead_open = () => {
    inHead = true;
    return "<cds-table-head>";
  };
  rules.thead_close = () => "</cds-table-head>";
  rules.tbody_open = () => {
    inHead = false;
    return "<cds-table-body>";
  };
  rules.tbody_close = () => "</cds-table-body>";
  rules.tr_open = () => (inHead ? "<cds-table-header-row>" : "<cds-table-row>");
  rules.tr_close = () =>
    inHead ? "</cds-table-header-row>" : "</cds-table-row>";
  rules.th_open = () => "<cds-table-header-cell>";
  rules.th_close = () => "</cds-table-header-cell>";
  rules.td_open = () => "<cds-table-cell>";
  rules.td_close = () => "</cds-table-cell>";

  // Fenced code. Replacing the fence rule outright means TypeDoc's shiki
  // highlight callback is never invoked for fenced blocks. The raw source is
  // slotted as text content (kept selectable/printable/searchable), and the
  // component does its own CodeMirror highlighting via the `highlight` attribute.
  // Both max-row attributes are 0 to put the snippet in fill-container mode: it
  // renders every line in full and never shows the "Show more"/"Show less"
  // button, which suits static docs where collapsing code adds no value.
  // `hide-line-numbers` drops the line-number gutter and `hide-fold` drops the
  // fold gutter (no collapse/expand control) for cleaner inline prose snippets.
  rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = (token.info || "").trim().split(/\s+/)[0] || "";
    const code = escapeText(token.content.replace(/\n$/, ""));
    return `<div class="cds--tile"><cds-aichat-code-snippet hide-header hide-line-numbers hide-fold language="${lang}" highlight max-collapsed-number-of-rows="0" max-expanded-number-of-rows="0">${code}</cds-aichat-code-snippet></div>`;
  };

  // Lists. cds-unordered-list auto-detects nesting at runtime via
  // closest(cds-list-item); cds-ordered-list does not, but nested ordered lists
  // are rare in the docs. Add explicit `nested` handling later if needed.
  // The `isExpressive` flag renders list items at Carbon body-02 (16px) to match
  // the surrounding prose; the components otherwise default to body-01 (14px) on
  // their shadow-DOM wrapper, which page CSS can't override for slotted items.
  // We set both attribute spellings on purpose: the boolean property has no
  // explicit `attribute:` in the CDN's current `/tag/latest/` build, so Lit
  // observes the lowercased `isexpressive`, while newer builds pin it to
  // `is-expressive`. Emitting both keeps lists at body-02 across either, which
  // matters because the floating CDN tag can roll forward without notice.
  rules.bullet_list_open = () =>
    "<cds-unordered-list isexpressive is-expressive>";
  rules.bullet_list_close = () => "</cds-unordered-list>";
  rules.ordered_list_open = () =>
    "<cds-ordered-list isexpressive is-expressive>";
  rules.ordered_list_close = () => "</cds-ordered-list>";
  rules.list_item_open = () => "<cds-list-item>";
  rules.list_item_close = () => "</cds-list-item>";
}

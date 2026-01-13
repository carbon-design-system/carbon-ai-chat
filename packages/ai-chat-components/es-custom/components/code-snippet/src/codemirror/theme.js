/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EditorView } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Creates a CodeMirror theme that uses Carbon Design System CSS custom properties.
 * This allows the editor to automatically adapt to Carbon's light/dark themes.
 *
 * @example
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { createCarbonTheme, createCarbonHighlightStyle } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import { createCarbonFoldMarker, carbonFoldMarkerKeyHandler } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 * import { lineNumbers, foldGutter } from '@codemirror/view';
 * import { javascript } from '@codemirror/lang-javascript';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),
 *     createCarbonHighlightStyle(),
 *     lineNumbers(),
 *     foldGutter({ markerDOM: createCarbonFoldMarker() }),
 *     carbonFoldMarkerKeyHandler(),  // Enable keyboard support for fold markers
 *     javascript(),
 *   ],
 * });
 * ```
 *
 * @returns CodeMirror theme extension
 */
function createCarbonTheme() {
    return EditorView.theme({
        ".cm-editor": {
            fontFamily: "var(--cds-custom-code-01-font-family, 'IBM Plex Mono', monospace)",
            fontSize: "var(--cds-custom-code-01-font-size, 0.875rem)",
            fontWeight: "var(--cds-custom-code-01-font-weight, 400)",
            letterSpacing: "var(--cds-custom-code-01-letter-spacing, 0.16px)",
            lineHeight: "var(--cds-custom-code-01-line-height, 1.5)",
            background: "var(--cds-custom-layer, #ffffff)",
            color: "var(--cds-custom-text-primary, #161616)",
        },
        // Cursor / caret
        ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: "var(--cds-custom-text-primary, #161616)",
        },
        // Gutters
        ".cm-gutters": {
            backgroundColor: "var(--cds-custom-background, #ffffff)",
            color: "var(--cds-custom-text-helper, #6f6f6f)",
            border: "none",
        },
        ".cm-gutterElement .cm-lineNumbers": {
            textAlign: "end",
        },
        ".cm-foldGutter": {
            paddingInlineEnd: "0.25rem",
        },
        // Editor content
        ".cm-content": {
            flexBasis: "0 !important",
            caretColor: "var(--cds-custom-text-primary, #161616)",
        },
        ".cm-scroller": {
            maxBlockSize: "var(--cds-custom-snippet-max-height, 16rem)",
            minBlockSize: "var(--cds-custom-snippet-min-height, 3rem)",
        },
        // Fold gutter / caret icons
        ".cm-foldGutter .cm-gutterElement": {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "16px",
        },
        ".cm-foldGutter svg": {
            width: "12px",
            height: "12px",
            cursor: "pointer",
            transition: "transform 0.11s cubic-bezier(0.2, 0, 0.38, 0.9)",
            fill: "var(--cds-custom-icon-primary, #161616)",
        },
        ".cm-foldGutter svg[aria-expanded='true']": {
            transform: "rotate(0deg)",
        },
        ".cm-foldGutter svg[aria-expanded='false']": {
            transform: "rotate(-90deg)",
        },
        ".cm-foldGutter svg:focus": {
            outline: "2px solid var(--cds-custom-focus, #0f62fe)",
        },
        // Search / selection highlights
        ".cm-searchMatch": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff)",
        },
        ".cm-searchMatch-selected": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff)",
        },
        ".cm-selectionBackground": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff)",
        },
        ".cm-selectionMatch": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff)",
        },
        "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff) !important",
        },
        "&.cm-focused .cm-selectionMatch": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff) !important",
        },
        // Native selection fallback
        ".cm-content ::selection": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff) !important",
        },
        "&.cm-focused .cm-content ::selection": {
            backgroundColor: "var(--cds-custom-highlight, #d0e2ff) !important",
        },
    });
}
/**
 * Creates syntax highlighting styles using Carbon Design System CSS custom properties.
 * This provides color theming for code syntax that adapts to Carbon's light/dark themes.
 *
 * All syntax colors are defined using CSS custom properties (--cds-custom-syntax-*) that can be
 * customized via your Carbon theme. Fallback values mirror VSCode Light defaults.
 *
 * @example
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { createCarbonTheme, createCarbonHighlightStyle } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import { python } from '@codemirror/lang-python';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),
 *     createCarbonHighlightStyle(),
 *     python(),
 *   ],
 * });
 * ```
 *
 * @returns CodeMirror syntax highlighting extension
 */
function createCarbonHighlightStyle() {
    return syntaxHighlighting(carbonHighlightStyle);
}
const TAG_REGISTRY = tags;
const toVarName = (name) => name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .toLowerCase();
const colorVar = (token) => `var(--cds-custom-syntax-${token}, var(--cds-custom-text-primary, #161616))`;
const resolveTag = (tagName) => TAG_REGISTRY[tagName];
const BASE_TAG_NAMES = [
    "comment",
    "lineComment",
    "blockComment",
    "docComment",
    "name",
    "variableName",
    "typeName",
    "tagName",
    "propertyName",
    "attributeName",
    "className",
    "labelName",
    "namespace",
    "macroName",
    "literal",
    "string",
    "docString",
    "character",
    "attributeValue",
    "number",
    "integer",
    "float",
    "bool",
    "regexp",
    "escape",
    "color",
    "url",
    "keyword",
    "self",
    "null",
    "atom",
    "unit",
    "modifier",
    "operatorKeyword",
    "controlKeyword",
    "definitionKeyword",
    "moduleKeyword",
    "operator",
    "derefOperator",
    "arithmeticOperator",
    "logicOperator",
    "bitwiseOperator",
    "compareOperator",
    "updateOperator",
    "definitionOperator",
    "typeOperator",
    "controlOperator",
    "punctuation",
    "separator",
    "bracket",
    "angleBracket",
    "squareBracket",
    "paren",
    "brace",
    "content",
    "heading",
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "contentSeparator",
    "list",
    "quote",
    "emphasis",
    "strong",
    "link",
    "monospace",
    "strikethrough",
    "invalid",
    "meta",
    "documentMeta",
    "annotation",
    "processingInstruction",
];
const HEADING_TAG_NAMES = [
    "heading",
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
];
const manualConfigs = [
    ...HEADING_TAG_NAMES.map((tagName) => ({
        tagName,
        style: {
            fontWeight: "bold",
            textDecoration: "underline",
        },
    })),
    { tagName: "link", style: { textDecoration: "underline" } },
    { tagName: "emphasis", style: { fontStyle: "italic" } },
    { tagName: "strong", style: { fontWeight: "bold" } },
    { tagName: "strikethrough", style: { textDecoration: "line-through" } },
];
const MANUAL_TAG_NAMES = new Set(manualConfigs.map(({ tagName }) => tagName));
const manualTokenStyles = manualConfigs
    .map(({ tagName, style }) => {
    const tag = resolveTag(tagName);
    if (!tag) {
        return null;
    }
    return {
        tag,
        color: colorVar(toVarName(tagName)),
        ...style,
    };
})
    .filter(Boolean);
const autoTagStyles = BASE_TAG_NAMES.filter((tagName) => !MANUAL_TAG_NAMES.has(tagName))
    .map((tagName) => {
    const tag = resolveTag(tagName);
    if (!tag) {
        return null;
    }
    return {
        tag,
        color: colorVar(toVarName(tagName)),
    };
})
    .filter(Boolean);
const modifierTokenStyles = [
    { tag: tags.definition(tags.variableName), color: colorVar("definition") },
    { tag: tags.definition(tags.propertyName), color: colorVar("definition") },
    { tag: tags.definition(tags.typeName), color: colorVar("definition") },
    { tag: tags.definition(tags.className), color: colorVar("definition") },
    { tag: tags.constant(tags.variableName), color: colorVar("constant") },
    { tag: tags.constant(tags.propertyName), color: colorVar("constant") },
    { tag: tags.constant(tags.typeName), color: colorVar("constant") },
    { tag: tags.function(tags.variableName), color: colorVar("function") },
    { tag: tags.function(tags.propertyName), color: colorVar("function") },
    { tag: tags.function(tags.typeName), color: colorVar("function") },
    { tag: tags.standard(tags.variableName), color: colorVar("standard") },
    { tag: tags.standard(tags.propertyName), color: colorVar("standard") },
    { tag: tags.local(tags.variableName), color: colorVar("local") },
    { tag: tags.local(tags.propertyName), color: colorVar("local") },
    { tag: tags.special(tags.variableName), color: colorVar("special") },
    { tag: tags.special(tags.propertyName), color: colorVar("special") },
    { tag: tags.special(tags.string), color: colorVar("special-string") },
];
const carbonHighlightStyle = HighlightStyle.define([
    ...modifierTokenStyles,
    ...manualTokenStyles,
    ...autoTagStyles,
]);

export { createCarbonHighlightStyle, createCarbonTheme };
//# sourceMappingURL=theme.js.map

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

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
export function createCarbonTheme() {
  return EditorView.theme({
    ".cm-editor": {
      fontFamily: "var(--cds-code-01-font-family)",
      fontSize: "var(--cds-code-01-font-size)",
      fontWeight: "var(--cds-code-01-font-weight)",
      letterSpacing: "var(--cds-code-01-letter-spacing)",
      lineHeight: "var(--cds-code-01-line-height)",
      background: "transparent",
    },
    // Make sure the gutters have a background color so horizontal scrolling goes underneath it invisibly.
    ".cm-gutters": {
      backgroundColor: "var(--cds-background)",
      color: "var(--cds-text-helper)",
      border: "none",
    },
    // Right align the line numbers
    ".cm-gutterElement .cm-lineNumbers": {
      textAlign: "end",
    },
    // Give a little space between the line numbers/carets and the content
    ".cm-foldGutter": {
      paddingInlineEnd: "0.25rem",
    },
    // Override CodeMirror's flex-basis to allow gutters to grow dynamically with line numbers
    ".cm-content": {
      flexBasis: "0 !important",
    },
    ".cm-scroller": {
      maxBlockSize: "var(--cds-snippet-max-height)",
      minBlockSize: "var(--cds-snippet-min-height)",
    },
    // Make sure there is enough room for the caret focus states in the gutter.
    ".cm-foldGutter .cm-gutterElement": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "16px",
    },
    // Set the size on the caret icon so it fits.
    ".cm-foldGutter svg": {
      width: "12px",
      height: "12px",
      cursor: "pointer",
      transition: "transform 0.11s cubic-bezier(0.2, 0, 0.38, 0.9)",
    },
    // Rotate the caret on expanded
    ".cm-foldGutter svg[aria-expanded='true']": {
      transform: "rotate(0deg)",
    },
    // Rotate the caret on closed
    ".cm-foldGutter svg[aria-expanded='false']": {
      transform: "rotate(-90deg)",
    },
    // Give the caret a focus state
    ".cm-foldGutter svg:focus": {
      outline: "2px solid var(--cds-focus, #0f62fe)",
    },
  });
}

/**
 * Creates syntax highlighting styles using Carbon Design System CSS custom properties.
 * This provides color theming for code syntax that adapts to Carbon's light/dark themes.
 *
 * All syntax colors are defined using CSS custom properties (--cds-syntax-*) that can be
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
export function createCarbonHighlightStyle() {
  return syntaxHighlighting(carbonHighlightStyle);
}

type StyleSpec = Parameters<typeof HighlightStyle.define>[0][number];

const TAG_REGISTRY = t as Record<string, unknown>;

const toVarName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .toLowerCase();

const colorVar = (token: string) =>
  `var(--cds-syntax-${token}, var(--cds-text-primary, #161616))`;

const resolveTag = (tagName: string) => TAG_REGISTRY[tagName] as any;

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
  "Content",
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
  "inserted",
  "deleted",
  "changed",
  "invalid",
  "meta",
  "documentMeta",
  "annotation",
  "processingInstruction",
] as const;

const HEADING_TAG_NAMES = [
  "heading",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
] as const;

const manualConfigs: Array<{
  tagName: string;
  style: Partial<Omit<StyleSpec, "tag">>;
}> = [
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

const manualTokenStyles: StyleSpec[] = manualConfigs
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
  .filter(Boolean) as StyleSpec[];

const autoTagStyles: StyleSpec[] = BASE_TAG_NAMES.filter(
  (tagName) => !MANUAL_TAG_NAMES.has(tagName),
)
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
  .filter(Boolean) as StyleSpec[];

const modifierTokenStyles: StyleSpec[] = [
  { tag: t.definition(t.variableName), color: colorVar("definition") },
  { tag: t.definition(t.propertyName), color: colorVar("definition") },
  { tag: t.definition(t.typeName), color: colorVar("definition") },
  { tag: t.definition(t.className), color: colorVar("definition") },
  { tag: t.constant(t.variableName), color: colorVar("constant") },
  { tag: t.constant(t.propertyName), color: colorVar("constant") },
  { tag: t.constant(t.typeName), color: colorVar("constant") },
  { tag: t.function(t.variableName), color: colorVar("function") },
  { tag: t.function(t.propertyName), color: colorVar("function") },
  { tag: t.function(t.typeName), color: colorVar("function") },
  { tag: t.standard(t.variableName), color: colorVar("standard") },
  { tag: t.standard(t.propertyName), color: colorVar("standard") },
  { tag: t.local(t.variableName), color: colorVar("local") },
  { tag: t.local(t.propertyName), color: colorVar("local") },
  { tag: t.special(t.variableName), color: colorVar("special") },
  { tag: t.special(t.propertyName), color: colorVar("special") },
  { tag: t.special(t.string), color: colorVar("special-string") },
];

const carbonHighlightStyle = HighlightStyle.define([
  ...modifierTokenStyles,
  ...manualTokenStyles,
  ...autoTagStyles,
]);

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

type StyleSpec = Parameters<typeof HighlightStyle.define>[0][number];

const TEXT_PRIMARY = "var(--cds-text-primary, #161616)";
const LAYER_ONE = "var(--cds-layer-01, #f4f4f4)";
const BACKGROUND_SELECTED = "var(--cds-background-selected, #e8daff)";
const GUTTER_BACKGROUND = "var(--cds-layer-accent-01, #e0e0e0)";
const TEXT_SECONDARY = "var(--cds-text-secondary, #525252)";

const TAG_REGISTRY = t as Record<string, unknown>;

const toVarName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .toLowerCase();

const colorVar = (token: string) =>
  `var(--cds-code-snippet-editor-${token}, ${TEXT_PRIMARY})`;

const resolveTag = (tagName: string) => TAG_REGISTRY[tagName] as any;

/**
 * Creates a CodeMirror theme that uses CSS custom properties for theming.
 * This allows the editor to automatically adapt to Carbon's light/dark themes.
 * Fallback values are based on Carbon Design System white theme.
 */
export function createCarbonTheme() {
  return EditorView.theme({
    "&": {
      color: TEXT_PRIMARY,
      backgroundColor: LAYER_ONE,
    },
    ".cm-content": {
      caretColor: TEXT_PRIMARY,
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: TEXT_PRIMARY,
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: BACKGROUND_SELECTED,
      },
    ".cm-gutters": {
      backgroundColor: GUTTER_BACKGROUND,
      color: TEXT_SECONDARY,
      border: "none",
    },
    ".cm-foldGutter": {
      width: "1rem",
      minWidth: "1rem",
    },
    ".cm-foldGutter .cm-gutterElement": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0",
      cursor: "pointer",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "var(--cds-code-snippet-editor-matching-bracket)",
      outline: "none",
    },
    ".cm-nonmatchingBracket": {
      color: "var(--cds-code-snippet-editor-nonmatching-bracket)",
    },
  });
}

/**
 * Creates syntax highlighting styles using CSS custom properties.
 */
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
  { tag: t.special(t.string), color: colorVar("special") },
];

const carbonHighlightStyle = HighlightStyle.define([
  ...modifierTokenStyles,
  ...manualTokenStyles,
  ...autoTagStyles,
]);

export function createCarbonHighlightStyle() {
  return syntaxHighlighting(carbonHighlightStyle);
}

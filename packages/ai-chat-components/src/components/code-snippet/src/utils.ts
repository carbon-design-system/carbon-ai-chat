/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { detect } from "program-language-detector";

const LANGUAGE_ALIASES: Record<string, string | undefined> = {
  javascript: "JavaScript",
  js: "JavaScript",
  node: "JavaScript",
  nodejs: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  jsonld: "JSON-LD",
  yaml: "YAML",
  yml: "YAML",
  html: "HTML",
  htm: "HTML",
  xml: "XML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "LESS",
  markdown: "Markdown",
  md: "Markdown",
  diff: "diff",
  patch: "diff",
  shell: "Shell",
  bash: "Shell",
  sh: "Shell",
  zsh: "Shell",
  powershell: "PowerShell",
  ps1: "PowerShell",
  python: "Python",
  py: "Python",
  ruby: "Ruby",
  rb: "Ruby",
  go: "Go",
  golang: "Go",
  php: "PHP",
  java: "Java",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  cs: "C#",
  graphql: "GraphQL",
  gql: "GraphQL",
};

const MARKDOWN_PATTERN =
  /(^|\n)#{1,6}\s|(^|\n)>|(^|\n)(?:-|\d+\.)\s|```|!\[[^\]]*\]\([^)]+\)/;
const DIFF_PATTERN = /(^|\n)(diff --|@@|\+\+\+|---|\+[^\n]*|-[^\n]*)/;
const SHELL_SHEBANG = /^#!\/bin\//;
const TYPESCRIPT_HINT_PATTERN =
  /\b(interface|type|enum)\s+\w+|\bimplements\s+[A-Z]|\breadonly\b|import\s+type\b|:\s*(?:string|number|boolean|unknown|any|void)(?=\s|,|;|\)|$)|<\w+\s*(?:extends\s+\w+)?\s*>/;

function looksLikeJSON(code: string): boolean {
  if (!code.trim().startsWith("{") && !code.trim().startsWith("[")) {
    return false;
  }
  try {
    JSON.parse(code);
    return true;
  } catch {
    return false;
  }
}

function resolvePatternLanguage(code: string): string | null {
  if (MARKDOWN_PATTERN.test(code)) {
    return "Markdown";
  }
  if (DIFF_PATTERN.test(code)) {
    return "diff";
  }
  if (SHELL_SHEBANG.test(code.trim())) {
    return "Shell";
  }
  if (looksLikeJSON(code)) {
    return "JSON";
  }
  return null;
}

function adjustDetectedLanguage(
  language: string | null,
  code: string,
): string | null {
  if (
    (language === "JavaScript" || language === "CSS") &&
    TYPESCRIPT_HINT_PATTERN.test(code)
  ) {
    return "TypeScript";
  }
  if (!language && TYPESCRIPT_HINT_PATTERN.test(code)) {
    return "TypeScript";
  }
  return language;
}

function normalizeLanguageKey(name: string): string {
  return name.trim().toLowerCase();
}

export function mapLanguageName(
  name: string | null | undefined,
): string | null {
  if (!name) {
    return null;
  }

  const normalized = normalizeLanguageKey(name);

  if (!normalized || normalized === "unknown" || normalized === "plaintext") {
    return null;
  }

  return LANGUAGE_ALIASES[normalized] ?? name;
}

/**
 * Observes resize of the given element with the given resize observer.
 * Returns an object with a release() method to clean up the observer.
 */
export const observeResize = (
  observer: ResizeObserver,
  elem: Element,
): { release(): null } | null => {
  if (!elem) {
    return null;
  }
  observer.observe(elem);
  return {
    release() {
      observer.unobserve(elem);
      return null;
    },
  };
};

/**
 * Gets scroll and dimension information from a code reference element.
 */
export function getCodeRefDimensions(ref: Element) {
  const {
    clientWidth: codeClientWidth,
    scrollLeft: codeScrollLeft,
    scrollWidth: codeScrollWidth,
  } = ref as HTMLElement;

  return {
    horizontalOverflow: codeScrollWidth > codeClientWidth,
    codeClientWidth,
    codeScrollWidth,
    codeScrollLeft,
  };
}

/**
 * Extracts text content from child nodes of an element without trimming so callers can decide how to normalize whitespace.
 */
export function extractTextContent(element: Element): string {
  const textContent = Array.from(element.childNodes)
    .filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE,
    )
    .map((node) => node.textContent || "")
    .join("");

  return textContent;
}

/**
 * Extracts text content from a slot's assigned nodes without trimming so streaming whitespace is preserved.
 */
export function extractSlotContent(slot: HTMLSlotElement): string {
  const nodes = slot.assignedNodes({ flatten: true });
  return nodes.map((node) => node.textContent || "").join("");
}

/**
 * Detects the programming language from code content.
 * Returns null if no confident match is found.
 */
export function detectLanguage(code: string): string | null {
  if (!code) {
    return null;
  }

  const trimmed = code.trim();

  if (!trimmed) {
    return null;
  }

  const patternMatch = resolvePatternLanguage(trimmed);
  if (patternMatch) {
    return patternMatch;
  }

  try {
    const detected = detect(trimmed);
    const mapped = mapLanguageName(detected);
    return adjustDetectedLanguage(mapped, trimmed) ?? mapped ?? null;
  } catch {
    return patternMatch;
  }
}

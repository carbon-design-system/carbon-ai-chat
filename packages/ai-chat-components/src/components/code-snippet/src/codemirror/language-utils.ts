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

/**
 * Maps common language name aliases to their canonical CodeMirror language names.
 *
 * This utility helps normalize various language identifiers (file extensions, common aliases)
 * to the standard names recognized by CodeMirror's language-data package.
 *
 * @example
 * ```typescript
 * import { mapLanguageName } from '@carbon/ai-chat-components/es/globals/codemirror/language-utils';
 *
 * mapLanguageName('js');        // 'JavaScript'
 * mapLanguageName('ts');        // 'TypeScript'
 * mapLanguageName('py');        // 'Python'
 * mapLanguageName('unknown');   // null
 * mapLanguageName('plaintext'); // null
 * ```
 *
 * @param name - The language name or alias to map
 * @returns The canonical language name, or null if unknown/plaintext
 */
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
 * Detects the programming language from code content using pattern matching and ML-based detection.
 *
 * This function uses a multi-strategy approach:
 * 1. Pattern-based detection for Markdown, JSON, diff files, and shell scripts
 * 2. ML-based detection using the program-language-detector library
 * 3. TypeScript-specific hints to distinguish TypeScript from JavaScript
 *
 * @example Basic usage
 * ```typescript
 * import { detectLanguage } from '@carbon/ai-chat-components/es/globals/codemirror/language-utils';
 *
 * const code = `
 *   interface User {
 *     name: string;
 *     age: number;
 *   }
 * `;
 *
 * const language = detectLanguage(code); // 'TypeScript'
 * ```
 *
 * @example With CodeMirror
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { LanguageDescription } from '@codemirror/language';
 * import { languages } from '@codemirror/language-data';
 * import { detectLanguage, mapLanguageName } from '@carbon/ai-chat-components/es/globals/codemirror/language-utils';
 *
 * const code = '{\n  "name": "example"\n}';
 * const detected = detectLanguage(code); // 'JSON'
 *
 * if (detected) {
 *   const langDesc = LanguageDescription.matchLanguageName(languages, detected, true);
 *   if (langDesc) {
 *     const langSupport = await langDesc.load();
 *     // Use langSupport in your editor
 *   }
 * }
 * ```
 *
 * @example Handling user input
 * ```typescript
 * import { mapLanguageName, detectLanguage } from '@carbon/ai-chat-components/es/globals/codemirror/language-utils';
 *
 * // User provides language hint
 * const userLang = 'py';
 * const mapped = mapLanguageName(userLang); // 'Python'
 *
 * // Or detect from content
 * const code = 'def hello():\n    print("Hello")';
 * const detected = detectLanguage(code); // 'Python'
 * ```
 *
 * @param code - The code content to analyze
 * @returns The detected language name (matching CodeMirror language names), or null if detection fails
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

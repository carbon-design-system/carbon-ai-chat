/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Signatures are evaluated in order and the first match wins, so they run from most to least
 * distinctive. Each pattern is chosen to be unambiguous on its own rather than merely suggestive —
 * ordering resolves the remaining overlap (a Python `def` ends in a colon, a Ruby one does not).
 *
 * Names match the language names used by `@codemirror/language-data` so callers can hand the result
 * straight to `LanguageDescription.matchLanguageName`.
 */
const SIGNATURES: { language: string; pattern: RegExp }[] = [
  { language: 'PHP', pattern: /<\?php\b|<\?=/ },
  // A doctype or an <html> root is conclusive. Bare markup tags are not — JSX and templating
  // languages use them too — so those are checked further down, after the script languages.
  { language: 'HTML', pattern: /<!DOCTYPE\s+html|<html\b/i },
  { language: 'Go', pattern: /^\s*package\s+\w+\s*$|^\s*func\s+\w*\s*\(|:=/m },
  {
    language: 'Java',
    pattern:
      /\bpublic\s+(?:final\s+|abstract\s+)?class\s+\w+|public\s+static\s+void\s+main\s*\(|\bSystem\.(?:out|err)\.print/,
  },
  {
    language: 'C++',
    pattern:
      /#include\s*<(?:iostream|vector|string|map)>|\bstd::\w+|\busing\s+namespace\s+\w+|\b(?:cout|cin|endl)\b|\bnullptr\b/,
  },
  {
    language: 'C',
    pattern:
      /#include\s*<\w+\.h>|\b(?:printf|scanf|malloc|free)\s*\(|\bint\s+main\s*\(/,
  },
  {
    language: 'Python',
    pattern:
      /^\s*(?:def|class)\s+\w+[^\n]*:\s*$|^\s*(?:from\s+[\w.]+\s+import\b|import\s+\w+\s*$)|^\s*if\s+__name__\s*==/m,
  },
  {
    language: 'Ruby',
    pattern:
      /^\s*(?:puts|require(?:_relative)?)\s+['"]?|\bdo\s*\|[^|]*\||^\s*end\s*$|\bdef\s+\w+[^\n(]*$|\belsif\b|\bnil\b/m,
  },
  {
    language: 'TypeScript',
    pattern:
      /^\s*(?:export\s+)?(?:interface|type|enum)\s+\w+|\bimplements\s+[A-Z]|\breadonly\b|\bimport\s+type\b|:\s*(?:string|number|boolean|unknown|any|void)\b/m,
  },
  {
    language: 'JavaScript',
    pattern:
      /\b(?:const|let|var)\s+[\w$]+\s*=|\bfunction\*?\s*[\w$]*\s*\(|=>|\bconsole\.\w+\s*\(|\b(?:import|export)\b[^\n]*\bfrom\b|\b(?:null|undefined)\b/,
  },
  {
    language: 'CSS',
    pattern: /@media\b|@import\b|[.#]?[\w-]+\s*\{[^}]*[\w-]+\s*:[^}]+;/,
  },
  // Bare markup, reached only once the script languages above have been ruled out.
  {
    language: 'HTML',
    pattern:
      /<(?:head|body|div|span|p|a|ul|ol|li|table|tr|td|form|input|button|script|style|link|meta|img|h[1-6])\b[^>]*>/i,
  },
];

/**
 * Detects a programming language from a code snippet, returning null when nothing matches
 * confidently enough.
 */
function detectLanguageFromSignatures(code: string): string | null {
  return SIGNATURES.find(({ pattern }) => pattern.test(code))?.language ?? null;
}

export { detectLanguageFromSignatures };

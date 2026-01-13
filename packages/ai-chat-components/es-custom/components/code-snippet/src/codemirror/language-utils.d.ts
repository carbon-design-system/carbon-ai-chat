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
export declare function mapLanguageName(name: string | null | undefined): string | null;
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
export declare function detectLanguage(code: string): string | null;

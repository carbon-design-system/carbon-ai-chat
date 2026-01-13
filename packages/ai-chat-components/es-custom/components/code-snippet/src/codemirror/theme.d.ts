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
export declare function createCarbonTheme(): import("@codemirror/state").Extension;
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
export declare function createCarbonHighlightStyle(): import("@codemirror/state").Extension;

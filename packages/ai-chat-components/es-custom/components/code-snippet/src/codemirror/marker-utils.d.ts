/**
 * Configuration options for the Carbon fold marker
 */
export interface CarbonFoldMarkerOptions {
    /**
     * Accessibility label for the collapse action (when block is expanded)
     * @default "Collapse code block"
     */
    collapseLabel?: string;
    /**
     * Accessibility label for the expand action (when block is collapsed)
     * @default "Expand code block"
     */
    expandLabel?: string;
}
/**
 * Creates a Carbon Design System styled fold marker for CodeMirror's foldGutter.
 *
 * This function returns a `markerDOM` function that can be used with CodeMirror's
 * `foldGutter()` extension to display Carbon's chevron icon as fold indicators.
 * The markers include proper accessibility attributes and keyboard support.
 *
 * **Note:** This function only provides the fold marker DOM. You must also include
 * `createCarbonTheme()` to get the proper styling (icon size, rotation, focus states).
 *
 * @example Basic usage
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { foldGutter } from '@codemirror/view';
 * import { createCarbonTheme } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import { createCarbonFoldMarker } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 * import { javascript } from '@codemirror/lang-javascript';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),           // Required for styling the fold markers
 *     foldGutter({
 *       markerDOM: createCarbonFoldMarker()
 *     }),
 *     javascript(),
 *   ],
 * });
 * ```
 *
 * @example Custom accessibility labels
 * ```typescript
 * import { foldGutter } from '@codemirror/view';
 * import { createCarbonFoldMarker } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 *
 * foldGutter({
 *   markerDOM: createCarbonFoldMarker({
 *     collapseLabel: 'Collapse this section',
 *     expandLabel: 'Expand this section',
 *   })
 * })
 * ```
 *
 * @example Keyboard accessibility
 * The fold markers are keyboard accessible by default:
 * - Tab to focus the marker
 * - Enter or Space to toggle fold/unfold
 * - Visual focus indicator matches Carbon Design System
 *
 * To enable keyboard support, you also need to add the keyboard event handler
 * using the `carbonFoldMarkerKeyHandler()` utility:
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { carbonFoldMarkerKeyHandler } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     // ... other extensions
 *     carbonFoldMarkerKeyHandler(),
 *   ],
 * });
 * ```
 *
 * @param options - Configuration options for labels
 * @returns A markerDOM function for use with foldGutter()
 */
export declare function createCarbonFoldMarker(options?: CarbonFoldMarkerOptions): (open: boolean) => HTMLElement;
/**
 * Creates a keyboard event handler for Carbon fold markers.
 *
 * This extension enables keyboard accessibility for fold markers created with
 * `createCarbonFoldMarker()`. It allows users to toggle code folding by pressing
 * Enter or Space when a fold marker is focused.
 *
 * @example Complete setup with keyboard support
 * ```typescript
 * import { EditorView } from 'codemirror';
 * import { foldGutter, lineNumbers } from '@codemirror/view';
 * import { createCarbonTheme } from '@carbon/ai-chat-components/es/globals/codemirror/theme';
 * import {
 *   createCarbonFoldMarker,
 *   carbonFoldMarkerKeyHandler
 * } from '@carbon/ai-chat-components/es/globals/codemirror/marker-utils';
 * import { javascript } from '@codemirror/lang-javascript';
 *
 * const editor = new EditorView({
 *   parent: document.body,
 *   extensions: [
 *     createCarbonTheme(),
 *     lineNumbers(),
 *     foldGutter({
 *       markerDOM: createCarbonFoldMarker()
 *     }),
 *     carbonFoldMarkerKeyHandler(),  // Enable keyboard support
 *     javascript(),
 *   ],
 * });
 * ```
 *
 * @example Keyboard interaction
 * - **Tab**: Focus the fold marker
 * - **Enter** or **Space**: Toggle fold/unfold
 * - **Tab** again: Move to next focusable element
 *
 * @returns CodeMirror extension for keyboard event handling
 */
export declare function carbonFoldMarkerKeyHandler(): import("@codemirror/state").Extension;

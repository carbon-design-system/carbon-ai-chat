/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Side-effect-free public entry for the Tiptap `JSONContent` walking helpers.
 *
 * The component's `index.js` barrel side-effect-registers the prompt-line custom elements (Lit)
 * and their editor runtime, so importing anything from it pulls that whole tree into the bundle.
 * These helpers, by contrast, operate on plain `JSONContent` POJOs and carry no runtime dependency
 * (their only `@tiptap/core` reference is a type, erased at build). Framework-agnostic consumers —
 * the chat core / SDK graph — import them here to avoid dragging Lit or Tiptap across the boundary.
 */

export {
  removeNodesByType,
  mapNodes,
  findNodesByType,
  getRawText,
  projectRawValue,
  textToDoc,
} from "./src/tiptap/json-utils.js";

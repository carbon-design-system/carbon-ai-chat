/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export { LanguageController } from "./language-controller.js";
export type { LanguageStateUpdate } from "./language-controller.js";
export { createContentSync } from "./content-sync.js";
export type { ContentSyncHandle } from "./content-sync.js";
export {
  createEditorView,
  applyLanguageSupport,
  updateReadOnlyConfiguration,
} from "./editor-manager.js";
export { EditorView } from "codemirror";
export { Compartment } from "@codemirror/state";

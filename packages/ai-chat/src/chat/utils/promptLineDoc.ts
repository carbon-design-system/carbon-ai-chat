/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Core-local re-export of the prompt-line `JSONContent` document helpers used by the SDK to read and
 * build rich-input docs. The helpers live in `@carbon/ai-chat-components`, but importing them from
 * the component's `index.js` barrel would side-effect-load the prompt-line custom elements (Lit) and
 * their Tiptap runtime. This module instead pulls the side-effect-free `json-utils.js` entry — whose
 * only `@tiptap/core` reference is a type, erased at build — and lives in the deliberately-unfenced
 * `utils/` layer so the framework-agnostic SDK dirs can use it without naming the component package.
 * Framework-freeness is enforced transitively by `tests/sdk/spec/sdkBoundary_spec.ts`. Mirrors the
 * `browser-utils` re-export in `browserUtils.ts`.
 */
export {
  getRawText,
  textToDoc,
} from "@carbon/ai-chat-components/es/components/prompt-line/json-utils.js";

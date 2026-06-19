/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Public barrel for the carbon Tiptap factories and helpers. Imported by the
 * `<cds-aichat-prompt-line>` element and re-exported from
 * [../../index.ts] so consumers can do
 * `import { carbonMention, ... } from "@carbon/ai-chat-components"`.
 */

export { carbonMention, carbonCommand } from "./carbon-mention.js";
export { carbonAutocomplete } from "./carbon-autocomplete.js";
export { carbonStarterTrigger } from "./carbon-starter-trigger.js";
export { carbonChatEnter } from "./chat-enter.js";
export { dispatchTriggerChange } from "./trigger-utils.js";
export { setHostOriginMeta, isHostOrigin } from "./origin-meta.js";
export {
  buildCarbonExtensions,
  type BuildCarbonExtensionsConfig,
} from "./build-extensions.js";
export {
  removeNodesByType,
  mapNodes,
  findNodesByType,
  getRawText,
  textToDoc,
  projectRawValue,
} from "./json-utils.js";

export type {
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  SuggestionItem,
  CustomListProps,
  TriggerChangeEventDetail,
} from "./types.js";

export { CarbonTokenNodeView } from "./token-node-view.js";
export type { CarbonTokenNodeViewOptions } from "./token-node-view.js";
export { renderTokenChip } from "./render-token-chip.js";
export type {
  RenderTokenChipArgs,
  TokenChipAttrs,
} from "./render-token-chip.js";
export {
  renderInLightDom,
  LIGHT_DOM_PORTAL_EVENT,
} from "./render-in-light-dom.js";
export type {
  RenderInLightDomArgs,
  RenderInLightDomResult,
  LightDomPortalEventDetail,
} from "./render-in-light-dom.js";

// Helper extensions are exposed for advanced hosts wanting to compose their
// own prompt-line equivalent. The prompt-line itself bundles them internally.
export { ValueSync } from "./value-sync.js";
export type { ValueSyncStorage } from "./value-sync.js";
export { TypingIndicator } from "./typing-indicator.js";
export type { TypingIndicatorStorage } from "./typing-indicator.js";
export { PlainTextPaste } from "./plain-text-paste.js";
export { Keymap } from "./keymap.js";
export { default as Placeholder } from "@tiptap/extension-placeholder";
export { UndoRedo } from "@tiptap/extensions";
export const HISTORY_DEFAULTS = { depth: 100, newGroupDelay: 500 } as const;
export type { StarterTriggerStorage } from "./carbon-starter-trigger.js";

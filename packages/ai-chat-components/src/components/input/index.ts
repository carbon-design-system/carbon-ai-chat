/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "./src/input-shell.js";
import "./src/prompt-line.js";
import "./src/send-control.js";
import "./src/stop-streaming-button.js";
import "./src/autocomplete-controller.js";

export { default as InputShellElement } from "./src/input-shell.js";
export { default as PromptLineElement } from "./src/prompt-line.js";
export { default as InputSendControlElement } from "./src/send-control.js";
export { default as StopStreamingButton } from "./src/stop-streaming-button.js";
export {
  default as AutocompleteControllerElement,
  AutocompleteController,
  type AutocompleteControllerOptions,
  type AutocompleteControllerState,
} from "./src/autocomplete-controller.js";

// Carbon Tiptap factories, helpers, and JSONContent walking utilities.
export {
  carbonMention,
  carbonCommand,
  carbonAutocomplete,
  carbonStarterTrigger,
  carbonChatEnter,
  dispatchTriggerChange,
  setHostOriginMeta,
  isHostOrigin,
  buildCarbonExtensions,
  projectRawValue,
  removeNodesByType,
  mapNodes,
  findNodesByType,
  getRawText,
  renderTokenChip,
  renderInLightDom,
  LIGHT_DOM_PORTAL_EVENT,
} from "./src/tiptap/index.js";

export type {
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  SuggestionItem,
  CustomListProps,
  TriggerChangeEventDetail,
  RenderTokenChipArgs,
  TokenChipAttrs,
  RenderInLightDomArgs,
  RenderInLightDomResult,
  LightDomPortalEventDetail,
} from "./src/tiptap/index.js";

// Curated runtime / event-detail types.
export type {
  FileUpload,
  InputChangeEventDetail,
  SendEventDetail,
  FileSelectEventDetail,
  FileRemoveEventDetail,
  TypingEventDetail,
} from "./src/types.js";

export { FileStatusValue } from "./src/types.js";

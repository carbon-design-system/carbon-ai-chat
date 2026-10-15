/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-autocomplete/index.js';
import AutocompleteControllerElement from './aichat-autocomplete-controller.js';
import StopStreamingButton from './aichat-stop-streaming-button.js';
import PromptLineShellElement from './aichat-prompt-line-shell.js';
import ErrorMessage from './aichat-error-message.js';
import InputSendControlElement from './aichat-input-send-control.js';
import PromptLineElement from './aichat-prompt-line.js';

export { default as PromptLineShellElement } from './aichat-prompt-line-shell.js';
export { default as PromptLineElement } from './aichat-prompt-line.js';
// Warms the Tiptap runtime chunk so a host (e.g. `@carbon/ai-chat`) can ensure
// the prompt-line mounts in rich mode on first paint, no textarea→editor flash.
export { preloadPromptLineRich } from './prompt-line-rich-loader.js';
export type {
  PromptLineController,
  PromptLineControllerInit,
} from './prompt-line-controller.js';
export { default as ErrorMessage } from './aichat-error-message.js';
export { default as InputSendControlElement } from './aichat-input-send-control.js';
export { default as StopStreamingButton } from './aichat-stop-streaming-button.js';
export { default as AutocompleteControllerElement } from './aichat-autocomplete-controller.js';
export {
  AutocompleteController,
  type AutocompleteControllerOptions,
  type AutocompleteControllerState,
} from './autocomplete-controller.js';

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
  textToDoc,
  renderTokenChip,
  renderInLightDom,
  LIGHT_DOM_PORTAL_EVENT,
} from './tiptap/index.js';

export type {
  BaseSuggestionConfig,
  TriggerSuggestionConfig,
  AutocompleteConfig,
  StartersConfig,
  SuggestionItem,
  SuggestionItemGroup,
  CustomListProps,
  TriggerChangeEventDetail,
  RenderTokenChipArgs,
  TokenChipAttrs,
  RenderInLightDomArgs,
  RenderInLightDomResult,
  LightDomPortalEventDetail,
} from './tiptap/index.js';

// Curated runtime / event-detail types.
export type {
  FileUpload,
  InputChangeEventDetail,
  SendEventDetail,
  FileSelectEventDetail,
  FileRemoveEventDetail,
  TypingEventDetail,
} from './types.js';

export { FileStatusValue } from './types.js';

defineCustomElement(AutocompleteControllerElement);
defineCustomElement(StopStreamingButton);
defineCustomElement(PromptLineShellElement);
defineCustomElement(ErrorMessage);
defineCustomElement(InputSendControlElement);
defineCustomElement(PromptLineElement);

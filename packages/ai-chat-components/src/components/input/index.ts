/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "./src/input-shell.js";
import "./src/send-control.js";
import "./src/stop-streaming-button.js";

export { default as InputShellElement } from "./src/input-shell.js";
export { default as InputSendControlElement } from "./src/send-control.js";
export { default as StopStreamingButton } from "./src/stop-streaming-button.js";

// Re-export types for consumers
export type {
  SuggestionItem,
  SuggestionConfig,
  FileUpload,
  FileStatusValue,
  CustomListProps,
  InputChangeEventDetail,
  SendEventDetail,
  FileSelectEventDetail,
  FileRemoveEventDetail,
  TriggerChangeEventDetail,
  TypingEventDetail,
} from "./src/types.js";

export { FileStatusValue as FileStatusValueEnum } from "./src/types.js";
export { SuggestionType } from "./src/types.js";

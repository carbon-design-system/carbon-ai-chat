/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { JSONContent } from '@tiptap/core';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { FileUpload } from '../../types/config/ServiceDeskConfig';
import { hasSendableInput } from './sendableInput';

interface InputValueChange {
  rawValue: string;
  content?: JSONContent;
}

function changeInputValue(
  { rawValue, content }: InputValueChange,
  changeLocalValue: (rawValue: string, content: JSONContent | null) => void,
  changeTrackedValue?: (value: InputValueChange) => void
) {
  changeLocalValue(rawValue, content ?? null);
  changeTrackedValue?.({
    rawValue,
    content: content ?? { type: 'doc', content: [] },
  });
}

interface SendInputValueArgs {
  getRawValue: () => string;
  getDisplayContent: () => JSONContent | null;
  pendingUploads?: FileUpload[];
  effectiveDisableSend: boolean;
  onSendInput: (text: string, displayContent?: JSONContent) => void;
  clearLocalValue: () => void;
  getPromptLine: () => Pick<
    PromptLineElement,
    'clearContent' | 'resetHistory'
  > | null;
  clearTrackedValue?: () => void;
}

function sendInputValue({
  getRawValue,
  getDisplayContent,
  pendingUploads,
  effectiveDisableSend,
  onSendInput,
  clearLocalValue,
  getPromptLine,
  clearTrackedValue,
}: SendInputValueArgs) {
  const text = getRawValue().trim();
  if (!hasSendableInput(text, pendingUploads) || effectiveDisableSend) {
    return;
  }

  // The callback may replace the surface or active slice before clearing.
  onSendInput(text, getDisplayContent() ?? undefined);
  clearLocalValue();
  const promptLine = getPromptLine();
  promptLine?.clearContent();
  promptLine?.resetHistory();
  clearTrackedValue?.();
}

interface MirrorInputValueArgs {
  rawValue: string;
  sliceChanged: boolean;
  restoreDraft: boolean;
  getRawValue: () => string;
  changeLocalValue: (rawValue: string) => void;
  getPromptLine: () => Pick<
    PromptLineElement,
    'getValue' | 'setContent'
  > | null;
}

function mirrorInputValue({
  rawValue,
  sliceChanged,
  restoreDraft,
  getRawValue,
  changeLocalValue,
  getPromptLine,
}: MirrorInputValueArgs) {
  if (rawValue === getRawValue()) {
    return;
  }

  changeLocalValue(rawValue);
  // Draft restoration applies the new slice's full document after readiness.
  if (restoreDraft && sliceChanged) {
    return;
  }
  const promptLine = getPromptLine();
  if (promptLine && promptLine.getValue() !== rawValue) {
    promptLine.setContent(rawValue);
  }
}

export { changeInputValue, mirrorInputValue, sendInputValue };

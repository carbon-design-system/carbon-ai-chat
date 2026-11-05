/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { InputFunctions } from './inputTypes';

type InputImperativeSurface = Pick<
  PromptLineElement,
  | 'disabled'
  | 'focus'
  | 'hasFocus'
  | 'setContent'
  | 'insertContent'
  | 'getEditor'
  | 'ensureEditor'
>;

function createInputImperativeHandle(
  getPromptLine: () => InputImperativeSurface | null,
  latchRich: () => void
): InputFunctions {
  return {
    requestFocus: () => {
      const promptLine = getPromptLine();
      // A hidden input has no surface, and a disabled one can't take focus.
      if (!promptLine || promptLine.disabled) {
        return false;
      }
      promptLine.focus();
      return true;
    },
    hasFocus: () => getPromptLine()?.hasFocus() ?? false,
    setContent: (next) => {
      const promptLine = getPromptLine();
      if (!promptLine) {
        throw new Error('Input is not currently rendered');
      }
      promptLine.setContent(next);
    },
    insertContent: (content, options) => {
      const promptLine = getPromptLine();
      if (!promptLine) {
        throw new Error('Input is not currently rendered');
      }
      promptLine.insertContent(content, options);
    },
    getEditor: () => getPromptLine()?.getEditor() ?? null,
    ensureEditor: () => {
      const promptLine = getPromptLine();
      if (!promptLine) {
        throw new Error('Input is not currently rendered');
      }
      // Keep later renders from reverting the element's sticky rich upgrade.
      latchRich();
      return promptLine.ensureEditor();
    },
  };
}

export { createInputImperativeHandle };

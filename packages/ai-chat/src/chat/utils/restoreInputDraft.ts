/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { ServiceManager } from '../services/ServiceManager';
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from '../store/selectors';
import { hasCustomPromptLine } from './customPromptLine';
import { isPlainTextDoc } from './inputContent';

export async function restoreInputDraft(
  serviceManager: ServiceManager,
  promptLine: PromptLineElement,
  isInputToHumanAgent: boolean,
  isCurrent: () => boolean,
  latchRich: () => void
): Promise<boolean> {
  const { store } = serviceManager;
  const canRestore = () =>
    isCurrent() &&
    selectIsInputToHumanAgent(store.getState()) === isInputToHumanAgent &&
    !hasCustomPromptLine(serviceManager);

  await promptLine.updateComplete;
  if (!canRestore()) {
    return false;
  }

  const draft = selectInputState(store.getState());
  if (!isPlainTextDoc(draft.content)) {
    latchRich();
    await promptLine.ensureEditor();
    if (!canRestore()) {
      return false;
    }
    const currentDraft = selectInputState(store.getState());
    if (
      currentDraft.rawValue !== draft.rawValue ||
      currentDraft.content !== draft.content
    ) {
      return false;
    }
    promptLine.setContent(draft.content);
  } else {
    promptLine.setContent(draft.rawValue ?? '');
  }
  return true;
}

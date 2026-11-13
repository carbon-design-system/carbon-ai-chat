/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../../shared/services/ServiceManager';
import type { AppState } from '../../types/state/AppState';
import { WriteableElementName } from '../../types/instance/WriteableElements';
import { selectInputState } from '../../shared/store/selectors';
import {
  getWriteableElementContent,
  hasMeaningfulContent,
} from './writeableElementPresence';
import { focusOnFirstFocusableElement, getDeepActiveElement } from './domUtils';
import { chatStore } from '../services/attachChatView';
import { writeableElementsOf } from './writeableElements';

export function hasCustomPromptLine(manager: ServiceManager): boolean {
  return hasMeaningfulContent(
    writeableElementsOf(manager)[WriteableElementName.CUSTOM_PROMPT_LINE]
  );
}

export function selectCustomPromptLineVisible(state: AppState): boolean {
  return (
    selectInputState(state).fieldVisible ??
    state.config.public.input?.isVisible ??
    true
  );
}

export function composerHasFocus(manager: ServiceManager): boolean {
  if (!hasCustomPromptLine(manager)) {
    return manager.view.current?.instance.input()?.hasFocus() ?? false;
  }
  const content = getWriteableElementContent(
    writeableElementsOf(manager)[WriteableElementName.CUSTOM_PROMPT_LINE]
  );
  let active = getDeepActiveElement();
  while (active) {
    if (content.some((node) => node.contains(active))) {
      return true;
    }
    const root = active.getRootNode();
    active = root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }
  return false;
}

export function requestComposerFocus(manager: ServiceManager): boolean {
  if (!hasCustomPromptLine(manager)) {
    return manager.view.current?.instance.input()?.requestFocus() ?? false;
  }
  const state = chatStore(manager).getState();
  if (
    !selectCustomPromptLineVisible(state) ||
    !state.view.persistedToBrowserStorage.viewState.mainWindow
  ) {
    return false;
  }
  return (
    composerHasFocus(manager) ||
    getWriteableElementContent(
      writeableElementsOf(manager)[WriteableElementName.CUSTOM_PROMPT_LINE]
    ).some(
      (node) =>
        node instanceof HTMLElement && focusOnFirstFocusableElement(node, true)
    )
  );
}

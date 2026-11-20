/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The chat's open confirmations. The view partition's `prompt` holds the
 * question the panel shows. The answers live here, outside the store, keyed
 * by the chat's store, so they last as long as the chat. An open prompt then
 * survives a reuse remount, and answering it from the next mount runs the
 * callback it opened with.
 */

import type { AppStore } from '../../sdk/store/appStore';
import type { AppState } from '../../types/state/AppState';
import type { ChatPrompt } from '../../types/state/ViewPartitionState';
import viewActions from './actions';

/** What answering a prompt runs. They must close over the chat, not a mount. */
interface PromptAnswers {
  onConfirm: () => void;
  onCancel?: () => void;
}

type PromptChoice = 'confirm' | 'cancel';

interface OpenPrompt {
  prompt: ChatPrompt;
  answers: PromptAnswers;
}

const openPromptsByChat = new WeakMap<object, Map<string, OpenPrompt>>();
let promptCount = 0;

function openPromptsOf(store: AppStore<AppState>): Map<string, OpenPrompt> {
  let prompts = openPromptsByChat.get(store);
  if (!prompts) {
    prompts = new Map();
    openPromptsByChat.set(store, prompts);
  }
  return prompts;
}

/**
 * Publishes the prompt to show. A card's prompt shows over the end-chat
 * prompt, and the end-chat prompt shows again once the card's closes.
 */
function showPrompt(store: AppStore<AppState>): void {
  let shown: ChatPrompt | null = null;
  openPromptsOf(store).forEach(({ prompt }) => {
    if (!shown || prompt.kind === 'humanAgent') {
      shown = prompt;
    }
  });
  store.dispatch(viewActions.setPrompt(shown));
}

/**
 * Closes a prompt without answering it. Closing one that's already closed,
 * or that a newer prompt of its kind replaced, does nothing.
 */
function closePrompt(store: AppStore<AppState>, id: string): void {
  if (openPromptsOf(store).delete(id)) {
    showPrompt(store);
  }
}

/**
 * Opens a prompt. Each kind has at most one open: a card's prompt replaces an
 * older card's, and opening the end-chat prompt again keeps the open one.
 *
 * @returns A release that closes this prompt only while it's still open, so
 *   an older card's cleanup can't close a newer card's prompt.
 */
function openPrompt(
  store: AppStore<AppState>,
  question: Omit<ChatPrompt, 'id'>,
  answers: PromptAnswers
): () => void {
  const prompts = openPromptsOf(store);
  for (const [openId, open] of prompts) {
    if (open.prompt.kind === question.kind) {
      if (question.kind === 'endChat') {
        return () => closePrompt(store, openId);
      }
      prompts.delete(openId);
    }
  }
  promptCount += 1;
  const id = `prompt-${promptCount}`;
  prompts.set(id, { prompt: { ...question, id }, answers });
  showPrompt(store);
  return () => closePrompt(store, id);
}

/**
 * Answers a prompt: closes it, then runs the answer it opened with. An
 * answer to a prompt that's no longer open does nothing.
 */
function answerPrompt(
  store: AppStore<AppState>,
  id: string,
  choice: PromptChoice
): void {
  const open = openPromptsOf(store).get(id);
  if (!open) {
    return;
  }
  closePrompt(store, id);
  if (choice === 'confirm') {
    open.answers.onConfirm();
  } else {
    open.answers.onCancel?.();
  }
}

export { answerPrompt, closePrompt, openPrompt };
export type { PromptChoice };

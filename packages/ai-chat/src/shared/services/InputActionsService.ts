/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// The pure helpers module: the prompt-line entry registers its elements.
import {
  getRawText,
  textToDoc,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/json-utils.js';
import type { Editor, JSONContent } from '@tiptap/core';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import cloneDeep from 'lodash-es/cloneDeep.js';

import { assertNoInFlightUpload } from './messaging/assertNoInFlightUpload';
import actions from '../store/actions';
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from '../store/selectors';
import { PendingUploadStatus } from '../../types/state/InputState';
import { StructuredData } from '../../types/messaging/Messages';
import { consoleError, consoleWarn } from '../utils/miscUtils';
import { isPlainTextDoc } from '../utils/inputContent';
import type { ServiceManager } from './ServiceManager';
import { CancellationReason } from '../../types/config/MessagingConfig';

/**
 * Module-scoped flag so the deprecation warning for `updateRawValue` is
 * emitted at most once per browser session, regardless of how many
 * times the host calls it.
 */
let hasWarnedAboutUpdateRawValueDeprecation = false;

class InputActionsService {
  private serviceManager: ServiceManager;

  /**
   * Maps pending upload IDs to their AbortControllers so that in-progress uploads can be cancelled
   * when the user removes an attachment before the upload completes.
   *
   * AbortControllers are not serializable and therefore cannot be stored in Redux.
   */
  private uploadAbortControllers = new Map<string, AbortController>();

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager;
  }

  /** The rendered input's handle, through the attached view. */
  private input() {
    return this.serviceManager.view.current?.instance.input() ?? null;
  }

  private hasCustomPromptLine() {
    return (
      this.serviceManager.view.current?.instance.hasCustomPromptLine() ?? false
    );
  }

  private assertBuiltInInput() {
    if (this.hasCustomPromptLine()) {
      throw new Error(
        'Input content is host-owned while CUSTOM_PROMPT_LINE has content.'
      );
    }
  }

  updateRawInputValue(updater: (previous: string) => string) {
    this.assertBuiltInInput();
    if (typeof updater !== 'function') {
      consoleError('Input updater must be a function');
      return;
    }

    const ref = this.input();
    const editor = ref?.getEditor();
    if (ref && editor) {
      const currentJson = editor.getJSON();
      if (!isPlainTextDoc(currentJson)) {
        throw new Error(
          'ChatInstance.input.updateRawValue cannot be used while the input contains non-text nodes or marked text. Use updateContent instead.'
        );
      }
      if (!hasWarnedAboutUpdateRawValueDeprecation) {
        hasWarnedAboutUpdateRawValueDeprecation = true;
        consoleWarn(
          'ChatInstance.input.updateRawValue is deprecated. Use updateContent.'
        );
      }
      let previousRaw = getRawText(currentJson);
      if (previousRaw === '\n') {
        previousRaw = '';
      }
      let nextValue: string;
      try {
        nextValue = updater(previousRaw);
      } catch (error) {
        consoleError('An error occurred while updating the input value', error);
        return;
      }
      if (typeof nextValue !== 'string') {
        nextValue =
          nextValue === undefined || nextValue === null
            ? ''
            : String(nextValue);
      }
      if (nextValue === previousRaw) {
        return;
      }
      ref.setContent(nextValue);
      return;
    }

    const { store } = this.serviceManager;
    const state = store.getState();
    const inputState = selectInputState(state);
    let previousValue = (inputState.rawValue ?? '') as string;

    if (previousValue === '\n') {
      previousValue = '';
    }

    let nextValue: string;
    try {
      nextValue = updater(previousValue);
    } catch (error) {
      consoleError('An error occurred while updating the input value', error);
      return;
    }

    if (typeof nextValue !== 'string') {
      nextValue =
        nextValue === undefined || nextValue === null ? '' : String(nextValue);
    }

    if (nextValue === previousValue) {
      return;
    }

    store.dispatch(
      actions.updateInputState(
        { rawValue: nextValue },
        selectIsInputToHumanAgent(state)
      )
    );
  }

  async updateInputContent(
    updater: (previous: JSONContent) => JSONContent
  ): Promise<void> {
    this.assertBuiltInInput();
    if (typeof updater !== 'function') {
      consoleError('Input content updater must be a function');
      return;
    }

    const { store } = this.serviceManager;
    const state = store.getState();
    const ref = this.input();
    const editor = ref?.getEditor() ?? null;

    let previous: JSONContent;
    if (editor) {
      previous = editor.getJSON();
    } else {
      let previousRaw = (selectInputState(state).rawValue ?? '') as string;
      if (previousRaw === '\n') {
        previousRaw = '';
      }
      previous = textToDoc(previousRaw);
    }

    let next: JSONContent;
    try {
      next = cloneDeep(updater(cloneDeep(previous)));
    } catch (error) {
      consoleError('An error occurred while updating the input content', error);
      return;
    }

    if (ref && editor) {
      ref.setContent(next);
      return;
    }

    if (isPlainTextDoc(next)) {
      store.dispatch(
        actions.updateInputState(
          { rawValue: getRawText(next), content: next },
          selectIsInputToHumanAgent(state)
        )
      );
      return;
    }

    if (!ref) {
      throw new Error(
        'ChatInstance.input.updateContent cannot seed non-text content before the input is rendered. Wait for the input to mount, or write plain text.'
      );
    }
    await ref.ensureEditor();
    this.assertBuiltInInput();
    if (this.input() !== ref) {
      throw new Error('Input is not currently rendered');
    }
    ref.setContent(next);
  }

  async ensureInputEditor(): Promise<Editor> {
    const ref = this.input();
    if (!ref || this.hasCustomPromptLine()) {
      throw new Error('Input is not currently rendered');
    }
    const editor = await ref.ensureEditor();
    if (this.input() !== ref || this.hasCustomPromptLine()) {
      throw new Error('Input is not currently rendered');
    }
    return editor;
  }

  updateStructuredData(
    updater: (
      previous: StructuredData | undefined
    ) => StructuredData | undefined
  ) {
    this.assertBuiltInInput();
    if (typeof updater !== 'function') {
      consoleError('Structured data updater must be a function');
      return;
    }

    const { store } = this.serviceManager;
    const state = store.getState();
    const inputState = selectInputState(state);
    const previousValue = cloneDeep(inputState.manualStructuredData);

    let nextValue: StructuredData | undefined;
    try {
      nextValue = cloneDeep(updater(previousValue));
    } catch (error) {
      consoleError(
        'An error occurred while updating the structured data',
        error
      );
      return;
    }

    store.dispatch(
      actions.updateStructuredData(nextValue, selectIsInputToHumanAgent(state))
    );
  }

  removePendingUpload(uploadId: string) {
    const controller = this.uploadAbortControllers.get(uploadId);
    if (controller) {
      controller.abort();
      this.uploadAbortControllers.delete(uploadId);
    }

    const { store } = this.serviceManager;
    store.dispatch(
      actions.removePendingUpload(
        uploadId,
        selectIsInputToHumanAgent(store.getState())
      )
    );
  }

  /** Aborts every upload still running, for a chat that shut down. */
  abortAllUploads() {
    this.uploadAbortControllers.forEach((controller) =>
      controller.abort(CancellationReason.CHAT_REMOVED)
    );
    this.uploadAbortControllers.clear();
  }

  async handleFileSelectedForUpload(file: File): Promise<void> {
    const { store } = this.serviceManager;
    const uploadConfig = store.getState().config.public.upload;

    if (
      !uploadConfig?.isOn ||
      !uploadConfig.onFileUpload ||
      this.serviceManager.isShutdown
    ) {
      return;
    }

    const uploadId = uuid();
    const controller = new AbortController();
    this.uploadAbortControllers.set(uploadId, controller);

    store.dispatch(
      actions.addPendingUpload(
        { id: uploadId, file, status: PendingUploadStatus.UPLOADING },
        selectIsInputToHumanAgent(store.getState())
      )
    );

    try {
      const contributedData = cloneDeep(
        await uploadConfig.onFileUpload(file, controller.signal)
      );
      if (!controller.signal.aborted) {
        store.dispatch(
          actions.updatePendingUpload(
            uploadId,
            { status: PendingUploadStatus.COMPLETE, contributedData },
            selectIsInputToHumanAgent(store.getState())
          )
        );
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      store.dispatch(
        actions.updatePendingUpload(
          uploadId,
          { status: PendingUploadStatus.ERROR, errorMessage },
          selectIsInputToHumanAgent(store.getState())
        )
      );
    } finally {
      this.uploadAbortControllers.delete(uploadId);
    }
  }

  assertNoInFlightUpload() {
    assertNoInFlightUpload(this.serviceManager.store.getState());
  }
}

export { InputActionsService };

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  getRawText,
  textToDoc,
} from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { Editor, JSONContent } from '@tiptap/core';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import cloneDeep from 'lodash-es/cloneDeep.js';

import actions from '../store/actions';
import {
  selectHasInFlightUpload,
  selectInputState,
  selectIsInputToHumanAgent,
} from '../store/selectors';
import { PendingUploadStatus } from '../../types/state/AppState';
import { StructuredData } from '../../types/messaging/Messages';
import { consoleError, consoleWarn } from '../utils/miscUtils';
import { isPlainTextDoc } from '../utils/inputContent';
import { hasCustomPromptLine } from '../utils/customPromptLine';
import type { ServiceManager } from './ServiceManager';

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

  private assertBuiltInInput() {
    if (hasCustomPromptLine(this.serviceManager)) {
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

    const ref = this.serviceManager.getInputFunctionsRef();
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
    const ref = this.serviceManager.getInputFunctionsRef();
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
    if (this.serviceManager.getInputFunctionsRef() !== ref) {
      throw new Error('Input is not currently rendered');
    }
    ref.setContent(next);
  }

  async ensureInputEditor(): Promise<Editor> {
    const ref = this.serviceManager.getInputFunctionsRef();
    if (!ref || hasCustomPromptLine(this.serviceManager)) {
      throw new Error('Input is not currently rendered');
    }
    const editor = await ref.ensureEditor();
    if (
      this.serviceManager.getInputFunctionsRef() !== ref ||
      hasCustomPromptLine(this.serviceManager)
    ) {
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

  async handleFileSelectedForUpload(file: File): Promise<void> {
    const { store } = this.serviceManager;
    const uploadConfig = store.getState().config.public.upload;

    if (!uploadConfig?.isOn || !uploadConfig.onFileUpload) {
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
    if (selectHasInFlightUpload(this.serviceManager.store.getState())) {
      throw new Error(
        'Cannot send while a file upload is in progress. Check instance.getState().input.hasInFlightUploads before sending, or wait for the upload to finish.'
      );
    }
  }
}

export { InputActionsService };

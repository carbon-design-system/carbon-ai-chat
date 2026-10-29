/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, fireEvent, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import type InputActions from '../../../src/chat/components/input/native/InputActions';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import type { StructuredData } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

it.each([
  ['compact', false],
  ['expanded', true],
] as const)(
  'keeps the mounted %s input action connected to upload, limits, completion, and removal',
  async (_layout, expanded) => {
    const completed = resolvablePromise<StructuredData>();
    const onFileUpload = jest.fn(() => completed);
    const { instance, store } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      openChatByDefault: true,
      homescreen: { isOn: false },
      input: { expanded, actions: [] },
      upload: { isOn: true, accept: '.txt', maxFiles: 1, onFileUpload },
    });
    const root = getChatShadowRoot();
    await waitFor(() => {
      expect(root.querySelector('cds-aichat-input-actions')).not.toBeNull();
    });
    const native = root.querySelector<InputActions>('cds-aichat-input-actions');
    await native.updateComplete;
    const fileInput =
      root.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput.accept).toBe('.txt');
    expect(fileInput.multiple).toBe(false);
    expect(fileInput.disabled).toBe(false);
    const chooseFile = jest.spyOn(fileInput, 'click');

    if (expanded) {
      act(() => {
        native
          .querySelector<HTMLElement>(
            'cds-icon-button:not([data-input-actions-trigger])'
          )
          .click();
      });
    } else {
      act(() => {
        native
          .querySelector<HTMLElement>('[data-input-actions-trigger]')
          .click();
      });
      await native.updateComplete;
      const menuItem = native.querySelector<HTMLElement & { label: string }>(
        'cds-menu-item'
      );
      expect(menuItem.label).toBe('Add files to upload');
      act(() => menuItem.click());
      await native.updateComplete;
      expect(native.querySelector('cds-menu')).toBeNull();
    }
    expect(chooseFile).toHaveBeenCalledTimes(1);

    const file = new File(['Upload from a native action'], 'selected.txt', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(onFileUpload).toHaveBeenCalledTimes(1));
    expect(onFileUpload).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(store.getState().assistantInputState.pendingUploads).toEqual([
      expect.objectContaining({ file, status: 'uploading' }),
    ]);
    expect(instance.getState().input.hasInFlightUploads).toBe(true);
    await waitFor(() => expect(fileInput.disabled).toBe(true));

    const contribution = { user_defined: { uploaded: file.name } };
    await act(async () => {
      completed.doResolve(contribution);
      await completed;
    });
    await waitFor(() => {
      expect(instance.getState().input.hasInFlightUploads).toBe(false);
      expect(instance.getState().input.structuredData).toEqual(contribution);
    });
    expect(
      store.getState().assistantInputState.pendingUploads[0]
    ).toMatchObject({
      status: 'complete',
      contributedData: contribution,
    });
    expect(fileInput.disabled).toBe(true);
    await waitFor(() => {
      expect(
        deepQuerySelector(root, 'button[aria-label="Remove selected.txt"]')
      ).not.toBeNull();
    });
    act(() => {
      (
        deepQuerySelector(
          root,
          'button[aria-label="Remove selected.txt"]'
        ) as HTMLButtonElement
      ).click();
    });
    await waitFor(() => {
      expect(store.getState().assistantInputState.pendingUploads).toEqual([]);
      expect(fileInput.disabled).toBe(false);
    });
    expect(
      instance.getState().input.structuredData?.user_defined?.uploaded
    ).toBeUndefined();
    expect(onFileUpload).toHaveBeenCalledTimes(1);
  }
);

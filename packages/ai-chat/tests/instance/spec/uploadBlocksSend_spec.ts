/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import actions from '../../../src/chat/store/actions';
import {
  PendingUploadStatus,
  type PendingUpload,
} from '../../../src/types/state/AppState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePendingUpload(
  overrides: Partial<PendingUpload> = {}
): PendingUpload {
  return {
    id: 'upload-1',
    file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    status: PendingUploadStatus.UPLOADING,
    ...overrides,
  };
}

describe('upload api - block sends while file is uploading', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // ---------------------------------------------------------------------------
  // Case 1: send() must reject while an upload is in progress, and must not
  // call customSendMessage.
  //
  // TDD: this test is expected to FAIL today because doSend() currently returns
  // early (silent no-op) instead of throwing. It will pass once the guard is
  // changed to throw/reject.
  // ---------------------------------------------------------------------------

  it('should reject with an upload-related error and not send the message', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({ status: PendingUploadStatus.UPLOADING }),
        false
      )
    );

    await expect(instance.send('hi')).rejects.toThrow(/upload/i);
    expect(mockCustomSendMessage).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Case 2: the early-exit must NOT mutate activeResponseId, and must not call
  // customSendMessage.
  //
  // TDD: this test is expected to FAIL today because doSend() dispatches
  // setActiveResponseId(null) *before* checking for in-flight uploads, so the
  // existing value is clobbered. It will pass once the guard fires before the
  // dispatch (or the dispatch is removed from the blocked path).
  // ---------------------------------------------------------------------------

  it('should not clear activeResponseId when send is blocked by an in-flight upload', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    // Set activeResponseId to a known non-null value the same way
    // activeResponseId_spec.ts does it.
    await instance.messaging.addMessage({
      id: 'response-before-send',
      output: { generic: [] },
    });
    expect(instance.getState().activeResponseId).toBe('response-before-send');

    // Seed an in-flight upload so the send is blocked.
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({ status: PendingUploadStatus.UPLOADING }),
        false
      )
    );

    // Swallow the rejection — we care about the state side-effect and the
    // absence of a customSendMessage call, not the rejection itself.
    await instance.send('hello').catch(() => {});

    // The existing activeResponseId must be untouched.
    expect(instance.getState().activeResponseId).toBe('response-before-send');
    // The message must not have left the client.
    expect(mockCustomSendMessage).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Cases 3 & 4: guard boundary — only UPLOADING blocks; COMPLETE and ERROR
  // must not prevent sending.
  //
  // A selector written as `pendingUploads.length > 0` or `!== COMPLETE` would
  // permanently block users whose upload errored. These tests catch that.
  // ---------------------------------------------------------------------------

  it('should not block send when the only upload is COMPLETE', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({ status: PendingUploadStatus.COMPLETE }),
        false
      )
    );

    await expect(instance.send('hi')).resolves.toBeUndefined();
    expect(mockCustomSendMessage).toHaveBeenCalledTimes(1);
  });

  it('should not block send when the only upload is in ERROR', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.ERROR,
          errorMessage: 'Network failure',
        }),
        false
      )
    );

    await expect(instance.send('hi')).resolves.toBeUndefined();
    expect(mockCustomSendMessage).toHaveBeenCalledTimes(1);
  });
});

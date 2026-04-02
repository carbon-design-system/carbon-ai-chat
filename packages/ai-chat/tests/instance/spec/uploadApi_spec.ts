/*
 *  Copyright IBM Corp. 2025
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
} from "../../test_helpers";
import actions from "../../../src/chat/store/actions";
import {
  PendingUploadStatus,
  type PendingUpload,
} from "../../../src/types/state/AppState";
import type { StructuredData } from "../../../src/types/messaging/Messages";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePendingUpload(
  overrides: Partial<PendingUpload> = {},
): PendingUpload {
  return {
    id: "upload-1",
    file: new File(["content"], "test.pdf", { type: "application/pdf" }),
    status: PendingUploadStatus.UPLOADING,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upload API – Redux store lifecycle", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // -------------------------------------------------------------------------
  // ADD_PENDING_UPLOAD
  // -------------------------------------------------------------------------

  it("ADD_PENDING_UPLOAD adds an entry to pendingUploads", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const upload = makePendingUpload();
    store.dispatch(actions.addPendingUpload(upload, false));

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(1);
    expect(state.assistantInputState.pendingUploads[0].id).toBe("upload-1");
    expect(state.assistantInputState.pendingUploads[0].status).toBe(
      PendingUploadStatus.UPLOADING,
    );
  });

  it("ADD_PENDING_UPLOAD does not affect pendingStructuredData while status is uploading", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const upload = makePendingUpload({ status: PendingUploadStatus.UPLOADING });
    store.dispatch(actions.addPendingUpload(upload, false));

    const state = store.getState();
    // An in-progress upload has no contributedData yet, so pendingStructuredData stays undefined.
    expect(state.assistantInputState.pendingStructuredData).toBeUndefined();
  });

  it("ADD_PENDING_UPLOAD with status=complete and contributedData rebuilds pendingStructuredData", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const contributedData: StructuredData = {
      fields: [
        { id: "doc", type: "file", value: { type: "reference", id: "ref-1" } },
      ],
    };
    const upload = makePendingUpload({
      status: PendingUploadStatus.COMPLETE,
      contributedData,
    });
    store.dispatch(actions.addPendingUpload(upload, false));

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toEqual(
      contributedData,
    );
  });

  // -------------------------------------------------------------------------
  // UPDATE_PENDING_UPLOAD
  // -------------------------------------------------------------------------

  it("UPDATE_PENDING_UPLOAD transitions status from uploading to complete", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));

    const contributedData: StructuredData = {
      fields: [
        {
          id: "resume",
          type: "file",
          value: { type: "reference", id: "ref-2" },
        },
      ],
    };
    store.dispatch(
      actions.updatePendingUpload(
        "upload-1",
        { status: PendingUploadStatus.COMPLETE, contributedData },
        false,
      ),
    );

    const state = store.getState();
    const upload = state.assistantInputState.pendingUploads[0];
    expect(upload.status).toBe(PendingUploadStatus.COMPLETE);
    expect(upload.contributedData).toEqual(contributedData);
  });

  it("UPDATE_PENDING_UPLOAD rebuilds pendingStructuredData after completion", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));

    const contributedData: StructuredData = {
      fields: [
        {
          id: "attachment",
          type: "file",
          value: { type: "reference", id: "ref-3" },
        },
      ],
    };
    store.dispatch(
      actions.updatePendingUpload(
        "upload-1",
        { status: PendingUploadStatus.COMPLETE, contributedData },
        false,
      ),
    );

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toEqual(
      contributedData,
    );
  });

  it("UPDATE_PENDING_UPLOAD transitions status to error and sets errorMessage", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));
    store.dispatch(
      actions.updatePendingUpload(
        "upload-1",
        { status: PendingUploadStatus.ERROR, errorMessage: "Network failure" },
        false,
      ),
    );

    const state = store.getState();
    const upload = state.assistantInputState.pendingUploads[0];
    expect(upload.status).toBe(PendingUploadStatus.ERROR);
    expect(upload.errorMessage).toBe("Network failure");
    // An errored upload contributes nothing to pendingStructuredData.
    expect(state.assistantInputState.pendingStructuredData).toBeUndefined();
  });

  it("UPDATE_PENDING_UPLOAD ignores unknown uploadId", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));
    store.dispatch(
      actions.updatePendingUpload(
        "does-not-exist",
        { status: PendingUploadStatus.COMPLETE },
        false,
      ),
    );

    const state = store.getState();
    // Original upload is unchanged.
    expect(state.assistantInputState.pendingUploads[0].status).toBe(
      PendingUploadStatus.UPLOADING,
    );
  });

  // -------------------------------------------------------------------------
  // REMOVE_PENDING_UPLOAD
  // -------------------------------------------------------------------------

  it("REMOVE_PENDING_UPLOAD removes the entry from pendingUploads", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));
    store.dispatch(actions.removePendingUpload("upload-1", false));

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(0);
  });

  it("REMOVE_PENDING_UPLOAD clears pendingStructuredData when the removed upload was the only contributor", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const contributedData: StructuredData = {
      fields: [
        { id: "doc", type: "file", value: { type: "reference", id: "ref-4" } },
      ],
    };
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.COMPLETE,
          contributedData,
        }),
        false,
      ),
    );
    // Confirm it was merged in.
    expect(store.getState().assistantInputState.pendingStructuredData).toEqual(
      contributedData,
    );

    store.dispatch(actions.removePendingUpload("upload-1", false));

    expect(
      store.getState().assistantInputState.pendingStructuredData,
    ).toBeUndefined();
  });

  it("REMOVE_PENDING_UPLOAD ignores unknown uploadId", async () => {
    const { store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));
    store.dispatch(actions.removePendingUpload("does-not-exist", false));

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Merge with manualStructuredData
  // -------------------------------------------------------------------------

  it("pendingStructuredData merges manualStructuredData with upload contributedData", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    // Set manual structured data (host-page fields).
    instance.input.updateStructuredData(() => ({
      fields: [{ id: "user_id", type: "text", value: "user-123" }],
    }));

    // Add a completed upload with its own contribution.
    const contributedData: StructuredData = {
      fields: [
        {
          id: "attachment",
          type: "file",
          value: { type: "reference", id: "ref-5" },
        },
      ],
    };
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.COMPLETE,
          contributedData,
        }),
        false,
      ),
    );

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData?.fields).toEqual([
      { id: "user_id", type: "text", value: "user-123" },
      {
        id: "attachment",
        type: "file",
        value: { type: "reference", id: "ref-5" },
      },
    ]);
  });

  it("removing an upload reverts pendingStructuredData to manualStructuredData only", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateStructuredData(() => ({
      fields: [{ id: "user_id", type: "text", value: "user-123" }],
    }));

    const contributedData: StructuredData = {
      fields: [
        {
          id: "attachment",
          type: "file",
          value: { type: "reference", id: "ref-6" },
        },
      ],
    };
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.COMPLETE,
          contributedData,
        }),
        false,
      ),
    );

    // Remove the upload.
    store.dispatch(actions.removePendingUpload("upload-1", false));

    const state = store.getState();
    // Only the manual data remains.
    expect(state.assistantInputState.pendingStructuredData?.fields).toEqual([
      { id: "user_id", type: "text", value: "user-123" },
    ]);
  });

  // -------------------------------------------------------------------------
  // Send guard
  // -------------------------------------------------------------------------

  it("doSend is blocked while an upload is in progress", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Add an in-progress upload.
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({ status: PendingUploadStatus.UPLOADING }),
        false,
      ),
    );

    mockCustomSendMessage.mockClear();
    await instance.send("hello");

    // customSendMessage should NOT have been called because the upload is in progress.
    expect(mockCustomSendMessage).not.toHaveBeenCalled();
  });

  it("doSend proceeds once all uploads are complete", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const contributedData: StructuredData = {
      fields: [
        { id: "doc", type: "file", value: { type: "reference", id: "ref-7" } },
      ],
    };
    // Add a completed upload.
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.COMPLETE,
          contributedData,
        }),
        false,
      ),
    );

    mockCustomSendMessage.mockClear();
    await instance.send("hello");

    expect(mockCustomSendMessage).toHaveBeenCalled();
    const sentMessage = mockCustomSendMessage.mock.calls[0][0];
    // The upload's contributedData should be merged into the outgoing message.
    expect(sentMessage.input.structured_data).toEqual(contributedData);
  });

  // -------------------------------------------------------------------------
  // CLEAR_STRUCTURED_DATA clears uploads too
  // -------------------------------------------------------------------------

  it("CLEAR_STRUCTURED_DATA clears pendingUploads and manualStructuredData", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateStructuredData(() => ({
      fields: [{ id: "x", type: "text", value: "y" }],
    }));
    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({
          status: PendingUploadStatus.COMPLETE,
          contributedData: { fields: [] },
        }),
        false,
      ),
    );

    store.dispatch(actions.clearStructuredData(false));

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(0);
    expect(state.assistantInputState.manualStructuredData).toBeUndefined();
    expect(state.assistantInputState.pendingStructuredData).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // getState().input.hasInFlightUploads
  // -------------------------------------------------------------------------

  it("getState().input.hasInFlightUploads is false when no uploads are pending", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(instance.getState().input.hasInFlightUploads).toBe(false);
  });

  it("getState().input.hasInFlightUploads is true while an upload is in progress", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(
      actions.addPendingUpload(
        makePendingUpload({ status: PendingUploadStatus.UPLOADING }),
        false,
      ),
    );

    expect(instance.getState().input.hasInFlightUploads).toBe(true);
  });

  it("getState().input.hasInFlightUploads is false once all uploads complete", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    store.dispatch(actions.addPendingUpload(makePendingUpload(), false));
    store.dispatch(
      actions.updatePendingUpload(
        "upload-1",
        { status: PendingUploadStatus.COMPLETE },
        false,
      ),
    );

    expect(instance.getState().input.hasInFlightUploads).toBe(false);
  });
});

// Made with Bob

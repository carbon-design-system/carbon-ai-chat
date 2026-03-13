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
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import { waitFor } from "@testing-library/react";
import type { StructuredData } from "../../../src/types/messaging/Messages";
import type { PublicConfig } from "../../../src/types/config/PublicConfig";
import { PendingUploadStatus } from "../../../src/types/state/AppState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name = "test.pdf"): File {
  return new File(["content"], name, { type: "application/pdf" });
}

function queryFileUploaderItem(): Element | null {
  const chatElement = document.querySelector("cds-aichat-react");
  return chatElement?.shadowRoot?.querySelector("cds-file-uploader-item");
}

/**
 * Creates a config with UploadConfig.is_on = true and a mock onFileUpload handler.
 */
function createUploadConfig(
  onFileUpload: (
    file: File,
    signal: AbortSignal,
  ) => Promise<StructuredData> = jest.fn().mockResolvedValue({}),
): PublicConfig {
  return {
    ...createBaseConfig(),
    upload: {
      is_on: true,
      onFileUpload,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upload UI wiring – handleFileSelectedForUpload", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // -------------------------------------------------------------------------
  // handleFileSelectedForUpload – happy path
  // -------------------------------------------------------------------------

  it("dispatches ADD_PENDING_UPLOAD with status=uploading when a file is selected", async () => {
    const onFileUpload = jest.fn().mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps status as "uploading"
    );

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    const file = makeFile();
    // Don't await — the upload never resolves in this test
    serviceManager.actions.handleFileSelectedForUpload(file);

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(1);
    expect(state.assistantInputState.pendingUploads[0].status).toBe(
      PendingUploadStatus.UPLOADING,
    );
    expect(state.assistantInputState.pendingUploads[0].file).toBe(file);

    await waitFor(() => {
      const item = queryFileUploaderItem();
      expect(item).not.toBeNull();
      expect(item?.getAttribute("state")).toBe("uploading");
    });
  });

  it("transitions to status=complete and populates contributedData on success", async () => {
    const contributedData: StructuredData = {
      fields: [{ id: "file-ref", type: "file", value: "ref-123" }],
    };
    const onFileUpload = jest.fn().mockResolvedValue(contributedData);

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    const file = makeFile();
    await serviceManager.actions.handleFileSelectedForUpload(file);

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(1);
    expect(state.assistantInputState.pendingUploads[0].status).toBe(
      PendingUploadStatus.COMPLETE,
    );
    expect(state.assistantInputState.pendingUploads[0].contributedData).toEqual(
      contributedData,
    );

    await waitFor(() => {
      const item = queryFileUploaderItem();
      expect(item).not.toBeNull();
      expect(item?.getAttribute("state")).toBe("edit");
    });
  });

  it("merges contributedData into pendingStructuredData after successful upload", async () => {
    const contributedData: StructuredData = {
      fields: [{ id: "attachment", type: "file", value: "ref-abc" }],
    };
    const onFileUpload = jest.fn().mockResolvedValue(contributedData);

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toBeDefined();
    expect(state.assistantInputState.pendingStructuredData.fields).toEqual(
      contributedData.fields,
    );
  });

  // -------------------------------------------------------------------------
  // handleFileSelectedForUpload – error path
  // -------------------------------------------------------------------------

  it("transitions to status=error and sets errorMessage when onFileUpload rejects", async () => {
    const onFileUpload = jest
      .fn()
      .mockRejectedValue(new Error("Upload failed"));

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(1);
    expect(state.assistantInputState.pendingUploads[0].status).toBe(
      PendingUploadStatus.ERROR,
    );
    expect(state.assistantInputState.pendingUploads[0].errorMessage).toBe(
      "Upload failed",
    );

    await waitFor(() => {
      const item = queryFileUploaderItem();
      expect(item).not.toBeNull();
      expect(item?.getAttribute("state")).toBe("edit");
      expect(item?.hasAttribute("invalid")).toBe(true);
      expect((item as any)?.errorSubject).toBe("Upload failed");
    });
  });

  it("does not set pendingStructuredData when upload errors", async () => {
    const onFileUpload = jest
      .fn()
      .mockRejectedValue(new Error("Network error"));

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // handleFileSelectedForUpload – abort path
  // -------------------------------------------------------------------------

  it("silently ignores the error when the upload is aborted mid-flight", async () => {
    const onFileUpload = jest.fn().mockImplementation(
      (_file: File, signal: AbortSignal) =>
        new Promise<StructuredData>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    const file = makeFile();
    const uploadPromise =
      serviceManager.actions.handleFileSelectedForUpload(file);

    // Grab the upload ID from the store
    const uploadId = store.getState().assistantInputState.pendingUploads[0].id;

    // Remove the upload (aborts the controller)
    serviceManager.actions.removePendingUpload(uploadId);

    // Wait for the upload promise to settle
    await uploadPromise;

    // The upload should have been removed — no error state
    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // handleFileSelectedForUpload – guard: no config
  // -------------------------------------------------------------------------

  it("does nothing when UploadConfig.is_on is false", async () => {
    const onFileUpload = jest.fn().mockResolvedValue({});
    const config: PublicConfig = {
      ...createBaseConfig(),
      upload: { is_on: false, onFileUpload },
    };

    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    expect(onFileUpload).not.toHaveBeenCalled();
    expect(store.getState().assistantInputState.pendingUploads).toHaveLength(0);
  });

  it("does nothing when onFileUpload is not provided", async () => {
    const config: PublicConfig = {
      ...createBaseConfig(),
      upload: { is_on: true },
    };

    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    expect(store.getState().assistantInputState.pendingUploads).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Startup validation
  // -------------------------------------------------------------------------

  it("logs an error at startup when is_on=true but onFileUpload is missing", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const config: PublicConfig = {
      ...createBaseConfig(),
      upload: { is_on: true }, // no onFileUpload
    };

    // The validation runs in initServiceManagerAndInstance() which completes before onBeforeRender.
    await renderChatAndGetInstanceWithStore(config);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("onFileUpload is not provided"),
    );

    consoleSpy.mockRestore();
  });

  it("does not log an error at startup when is_on=true and onFileUpload is provided", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await renderChatAndGetInstanceWithStore(
      createUploadConfig(jest.fn().mockResolvedValue({})),
    );

    const uploadErrors = consoleSpy.mock.calls.filter((args) =>
      String(args[0]).includes("onFileUpload"),
    );
    expect(uploadErrors).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Multiple files
  // -------------------------------------------------------------------------

  it("handles multiple files independently — each gets its own pendingUpload entry", async () => {
    const contributedData1: StructuredData = {
      fields: [{ id: "f1", type: "file", value: "ref-1" }],
    };
    const contributedData2: StructuredData = {
      fields: [{ id: "f2", type: "file", value: "ref-2" }],
    };
    const onFileUpload = jest
      .fn()
      .mockResolvedValueOnce(contributedData1)
      .mockResolvedValueOnce(contributedData2);

    const { store, serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload),
    );

    await Promise.all([
      serviceManager.actions.handleFileSelectedForUpload(makeFile("a.pdf")),
      serviceManager.actions.handleFileSelectedForUpload(makeFile("b.pdf")),
    ]);

    const state = store.getState();
    expect(state.assistantInputState.pendingUploads).toHaveLength(2);
    expect(
      state.assistantInputState.pendingUploads.every(
        (u) => u.status === PendingUploadStatus.COMPLETE,
      ),
    ).toBe(true);
    // Both fields should be merged into pendingStructuredData
    expect(state.assistantInputState.pendingStructuredData.fields).toHaveLength(
      2,
    );
  });
});

// Made with Bob

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { FILE_UPLOADER_ITEM_STATE } from "@carbon/web-components/es/components/file-uploader/defs.js";
import {
  getFileUploaderItemDisplayProps,
  getFileUploaderItemState,
} from "../../../src/chat/components-legacy/input/fileUploaderItemStateUtils";
import {
  FileStatusValue,
  FileUpload,
} from "../../../src/types/config/ServiceDeskConfig";

function makeFileUpload(overrides: Partial<FileUpload> = {}): FileUpload {
  return {
    id: "upload-1",
    file: new File(["content"], "test.pdf", { type: "application/pdf" }),
    status: FileStatusValue.EDIT,
    ...overrides,
  };
}

const languagePack = {
  fileSharing_removeButtonTitle: "Remove file",
  fileSharing_statusUploading: "Uploading file",
};

describe("fileUploaderItemStateUtils", () => {
  it("maps uploading + non-error to UPLOADING state", () => {
    const upload = makeFileUpload({ status: FileStatusValue.UPLOADING });

    expect(getFileUploaderItemState(upload)).toBe(
      FILE_UPLOADER_ITEM_STATE.UPLOADING,
    );
  });

  it("maps complete + non-error to EDIT state", () => {
    const upload = makeFileUpload({ status: FileStatusValue.COMPLETE });

    expect(getFileUploaderItemState(upload)).toBe(
      FILE_UPLOADER_ITEM_STATE.EDIT,
    );
  });

  it("maps error uploads to EDIT state regardless of status", () => {
    const upload = makeFileUpload({
      status: FileStatusValue.UPLOADING,
      isError: true,
    });

    expect(getFileUploaderItemState(upload)).toBe(
      FILE_UPLOADER_ITEM_STATE.EDIT,
    );
  });

  it("maps unknown statuses to EDIT state", () => {
    const upload = makeFileUpload({
      status: "unknown-status" as FileStatusValue,
    });

    expect(getFileUploaderItemState(upload)).toBe(
      FILE_UPLOADER_ITEM_STATE.EDIT,
    );
  });

  it("uses uploading assistive text only while uploading", () => {
    const uploadingUpload = makeFileUpload({
      status: FileStatusValue.UPLOADING,
    });
    const completeUpload = makeFileUpload({ status: FileStatusValue.COMPLETE });

    expect(
      getFileUploaderItemDisplayProps(uploadingUpload, languagePack)
        .iconDescription,
    ).toBe(languagePack.fileSharing_statusUploading);
    expect(
      getFileUploaderItemDisplayProps(completeUpload, languagePack)
        .iconDescription,
    ).toBe(languagePack.fileSharing_removeButtonTitle);
  });
});

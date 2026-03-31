/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { FILE_UPLOADER_ITEM_STATE } from "@carbon/web-components/es/components/file-uploader/defs.js";
import { LanguagePack } from "../../../types/config/PublicConfig";
import {
  FileStatusValue,
  FileUpload,
} from "../../../types/config/ServiceDeskConfig";

type FileUploaderItemLanguagePack = Pick<
  LanguagePack,
  "fileSharing_removeButtonTitle" | "fileSharing_statusUploading"
>;

interface FileUploaderItemDisplayProps {
  state: FILE_UPLOADER_ITEM_STATE;
  iconDescription: string;
}

function getFileUploaderItemState(
  fileUpload: FileUpload,
): FILE_UPLOADER_ITEM_STATE {
  if (fileUpload.isError === true) {
    return FILE_UPLOADER_ITEM_STATE.EDIT;
  }

  if (fileUpload.status === FileStatusValue.UPLOADING) {
    return FILE_UPLOADER_ITEM_STATE.UPLOADING;
  }

  return FILE_UPLOADER_ITEM_STATE.EDIT;
}

function getFileUploaderItemDisplayProps(
  fileUpload: FileUpload,
  languagePack: FileUploaderItemLanguagePack,
): FileUploaderItemDisplayProps {
  const state = getFileUploaderItemState(fileUpload);
  const iconDescription =
    state === FILE_UPLOADER_ITEM_STATE.UPLOADING
      ? languagePack.fileSharing_statusUploading
      : languagePack.fileSharing_removeButtonTitle;

  return {
    state,
    iconDescription,
  };
}

export { getFileUploaderItemDisplayProps, getFileUploaderItemState };
export type { FileUploaderItemDisplayProps, FileUploaderItemLanguagePack };

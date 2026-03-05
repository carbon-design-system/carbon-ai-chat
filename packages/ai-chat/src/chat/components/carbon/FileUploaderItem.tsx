/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import {
  FILE_UPLOADER_ITEM_SIZE,
  FILE_UPLOADER_ITEM_STATE,
} from "@carbon/web-components/es/components/file-uploader/defs.js";
import CarbonFileUploaderItemElement from "@carbon/web-components/es/components/file-uploader/file-uploader-item.js";

type FileUploaderItemBeingDeletedEvent = CustomEvent<void>;
type FileUploaderItemDeletedEvent = CustomEvent<void>;

type FileUploaderItemEvents = {
  onBeingDeleted: EventName<FileUploaderItemBeingDeletedEvent>;
  onDelete: EventName<FileUploaderItemDeletedEvent>;
};

const FILE_UPLOADER_ITEM_EVENTS: FileUploaderItemEvents = {
  onBeingDeleted:
    CarbonFileUploaderItemElement.eventBeforeDelete as EventName<FileUploaderItemBeingDeletedEvent>,
  onDelete:
    CarbonFileUploaderItemElement.eventDelete as EventName<FileUploaderItemDeletedEvent>,
};

const FileUploaderItem = createComponent<
  CarbonFileUploaderItemElement,
  FileUploaderItemEvents
>({
  tagName: "cds-file-uploader-item",
  elementClass: CarbonFileUploaderItemElement,
  react: React,
  events: FILE_UPLOADER_ITEM_EVENTS,
});

type FileUploaderItemProps = React.ComponentProps<typeof FileUploaderItem>;

export default FileUploaderItem;
export { FILE_UPLOADER_ITEM_SIZE, FILE_UPLOADER_ITEM_STATE };
export type {
  FileUploaderItemProps,
  FileUploaderItemEvents,
  FileUploaderItemBeingDeletedEvent,
  FileUploaderItemDeletedEvent,
};

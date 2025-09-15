/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import {
  FILE_UPLOADER_ITEM_SIZE,
  FILE_UPLOADER_ITEM_STATE,
} from "@carbon/web-components/es/components/file-uploader/defs.js";
import CarbonFileUploaderItemElement from "@carbon/web-components/es/components/file-uploader/file-uploader-item.js";

const FileUploaderItem = createComponent({
  tagName: "cds-file-uploader-item",
  elementClass: CarbonFileUploaderItemElement,
  react: React,
  events: {
    onBeingDeleted: "cds-file-uploader-item-beingdeleted",
    onDelete: "cds-file-uploader-item-deleted",
  },
});

export default FileUploaderItem;
export { FILE_UPLOADER_ITEM_SIZE, FILE_UPLOADER_ITEM_STATE };

/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";
import FileUploadsElement from "../components/file-uploads/src/file-uploads.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

const CDSAIChatFileUploads = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-file-uploads",
    elementClass: FileUploadsElement,
    react: React,
    events: {
      onFileRemove: "cds-aichat-file-remove",
    },
  }),
);

export default CDSAIChatFileUploads;

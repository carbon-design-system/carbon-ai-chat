/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from '@lit/react';
import React from 'react';
import { FileUploadItemElement } from '../components/aichat-file-uploads/index.js';
import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const CDSAIChatFileUploadItem = withWebComponentBridge(
  createComponent({
    tagName: FileUploadItemElement.is,
    elementClass: FileUploadItemElement,
    react: React,
    events: {
      onFileRemove: 'cds-aichat-file-remove',
    },
  })
);

export default CDSAIChatFileUploadItem;

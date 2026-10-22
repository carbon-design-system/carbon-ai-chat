/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineCustomElement } from '../../globals/register.js';
import FileUploadsElement from './aichat-file-uploads.js';
import FileUploadItemElement from './aichat-file-upload-item.js';

export { default as FileUploadsElement } from './aichat-file-uploads.js';
export { default as FileUploadItemElement } from './aichat-file-upload-item.js';

export type { FileAttachment } from './types.js';
export type { FileRemoveEventDetail } from '../aichat-prompt-line/types.js';

defineCustomElement(FileUploadsElement);
defineCustomElement(FileUploadItemElement);

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../services/ServiceManager';
import type { FileUpload } from '../../types/config/ServiceDeskConfig';

export function createAssistantUploadCallbacks(serviceManager: ServiceManager) {
  return {
    onAssistantFilesSelectedForUpload(uploads: FileUpload[]) {
      for (const upload of uploads) {
        serviceManager.actions.handleFileSelectedForUpload(upload.file);
      }
    },
    onRemoveAssistantUpload(uploadId: string) {
      serviceManager.actions.removePendingUpload(uploadId);
    },
  };
}

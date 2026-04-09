/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback } from "react";
import type { ServiceManager } from "../services/ServiceManager";
import type { FileUpload } from "../../types/config/ServiceDeskConfig";

interface UseAssistantUploadCallbacksProps {
  serviceManager: ServiceManager;
}

interface UseAssistantUploadCallbacksReturn {
  /**
   * Called when the user selects one or more files via the attachment button in the
   * assistant (non-human-agent) context. Delegates each file to
   * `ChatActionsImpl.handleFileSelectedForUpload` which orchestrates the full upload
   * lifecycle (ADD_PENDING_UPLOAD → onFileUpload → UPDATE_PENDING_UPLOAD).
   */
  onAssistantFilesSelectedForUpload: (uploads: FileUpload[]) => void;

  /**
   * Called when the user removes a pending upload chip in the assistant context.
   * Delegates to `ChatActionsImpl.removePendingUpload` which aborts any in-progress
   * upload and dispatches REMOVE_PENDING_UPLOAD.
   */
  onRemoveAssistantUpload: (uploadId: string) => void;
}

/**
 * Custom hook that provides file-upload callbacks for the assistant (non-human-agent)
 * upload UI. This is the assistant-context counterpart to `useHumanAgentCallbacks`.
 *
 * @experimental
 */
export function useAssistantUploadCallbacks({
  serviceManager,
}: UseAssistantUploadCallbacksProps): UseAssistantUploadCallbacksReturn {
  const onAssistantFilesSelectedForUpload = useCallback(
    (uploads: FileUpload[]) => {
      for (const upload of uploads) {
        // Each FileUpload carries the raw File object. Kick off the upload lifecycle
        // for each file independently so they can succeed/fail individually.
        serviceManager.actions.handleFileSelectedForUpload(upload.file);
      }
    },
    [serviceManager],
  );

  const onRemoveAssistantUpload = useCallback(
    (uploadId: string) => {
      serviceManager.actions.removePendingUpload(uploadId);
    },
    [serviceManager],
  );

  return {
    onAssistantFilesSelectedForUpload,
    onRemoveAssistantUpload,
  };
}

// Made with Bob

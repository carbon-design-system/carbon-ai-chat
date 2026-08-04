/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  FileStatusValue,
  type FileUpload,
} from '../../types/config/ServiceDeskConfig';

/**
 * Whether there is anything to send. A staged file is content on its own, so a
 * file with no caption is a valid message — the industry-standard behaviour, and
 * what the attach affordance implies.
 *
 * Deliberately keyed on staged uploads rather than on structured data at large: a
 * host can park its own fields on `structured_data` via
 * `instance.input.updateStructuredData`, and a hidden sidecar must not make an
 * empty composer sendable. Attaching a file is a visible, deliberate act; a host
 * setting a field is not.
 */
function hasSendableInput(
  text: string,
  pendingUploads?: FileUpload[]
): boolean {
  if (text?.trim()) {
    return true;
  }

  return Boolean(
    pendingUploads?.length && !pendingUploads.every((upload) => upload.isError)
  );
}

/**
 * Whether a file is still transferring.
 *
 * `doSend` refuses to send during a transfer, so the Send control has to be
 * disabled for the same window. Left enabled it would light up and do nothing.
 */
function hasInFlightUpload(pendingUploads?: FileUpload[]): boolean {
  return Boolean(
    pendingUploads?.some(
      (upload) => upload.status === FileStatusValue.UPLOADING
    )
  );
}

export { hasInFlightUpload, hasSendableInput };

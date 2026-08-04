/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import FileUploadItem from '@carbon/ai-chat-components/es/react/file-upload-item.js';
import React from 'react';

import type { MessageFileAttachment } from '../../../utils/fileAttachments';

interface MessageFileAttachmentsProps {
  /** The attachments to render, in the order they appear on the message. */
  attachments: MessageFileAttachment[];

  /** Accessible name for the list of attachments. */
  label: string;

  /** Text shown for an attachment whose name could not be recovered. */
  fallbackName: string;
}

/**
 * Renders the files attached to a sent message as a row of read-only chips.
 *
 * Takes its strings as props rather than reading the language pack, which keeps it
 * free of store access and testable on its own.
 */
function MessageFileAttachments({
  attachments,
  label,
  fallbackName,
}: MessageFileAttachmentsProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    // `role="list"` reads as redundant on a `ul`, but Safari drops implicit list
    // semantics once `list-style: none` is set, taking the attachment count with
    // them. Stating it keeps the count announced.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul
      role="list"
      className="cds-aichat--message-attachments"
      aria-label={label}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          {/* Same chip as the input area, in its read-only state: no upload status
              and no remove button, because a sent attachment cannot be edited. */}
          <FileUploadItem
            className="cds-aichat--message-attachments__chip"
            upload={attachment}
            readOnly
            fallbackLabel={fallbackName}
          />
        </li>
      ))}
    </ul>
  );
}

export { MessageFileAttachments };
export type { MessageFileAttachmentsProps };

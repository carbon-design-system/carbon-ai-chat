/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/** The app wrapper preserves list semantics when Safari drops them for list-style:none. */

import React from 'react';
import { render } from '@testing-library/react';

import { MessageFileAttachments } from '../MessageFileAttachments';
import type { MessageFileAttachment } from '../../../../utils/fileAttachments';

const ATTACHMENTS: MessageFileAttachment[] = [
  { id: 'a', name: 'report.pdf', mimeType: 'application/pdf' },
  { id: 'b', name: 'notes.txt', mimeType: 'text/plain' },
];

function renderAttachments(attachments: MessageFileAttachment[]) {
  return render(
    <MessageFileAttachments
      attachments={attachments}
      label="Attachments"
      fallbackName="Attachment"
    />
  );
}

describe('MessageFileAttachments', () => {
  it('names the list so the attachment count is announced', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list.getAttribute('aria-label')).toBe('Attachments');
    // `list-style: none` drops implicit list semantics in Safari, taking the count
    // with them, so the role is stated rather than inferred.
    expect(list.getAttribute('role')).toBe('list');
  });
});

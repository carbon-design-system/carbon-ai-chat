/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `MessageFileAttachments` hands each attachment to a `cds-aichat-file-upload-item`
 * in its read-only state — the same chip the input area uses. That hand-off is what
 * these tests pin; the chip's own rendering is covered by the element's
 * web-test-runner spec, which runs in a real browser where the shadow root is
 * trustworthy.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { MessageFileAttachments } from '../../../src/chat/components/helpers/MessageFileAttachments/MessageFileAttachments';
import type { MessageFileAttachment } from '../../../src/chat/utils/fileAttachments';

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

function chipsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('cds-aichat-file-upload-item'));
}

describe('MessageFileAttachments', () => {
  it('renders one chip per attachment, in order', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    expect(chipsIn(container)).toHaveLength(2);
  });

  it('passes each attachment through to its chip as an object property', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    const forwarded = chipsIn(container).map(
      (chip) => (chip as unknown as { upload: MessageFileAttachment }).upload
    );

    expect(forwarded).toEqual(ATTACHMENTS);
  });

  it('passes the fallback name to every chip', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    chipsIn(container).forEach((chip) => {
      expect((chip as unknown as { fallbackLabel: string }).fallbackLabel).toBe(
        'Attachment'
      );
    });
  });

  it('names the list so the attachment count is announced', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list.getAttribute('aria-label')).toBe('Attachments');
    // `list-style: none` drops implicit list semantics in Safari, taking the count
    // with them, so the role is stated rather than inferred.
    expect(list.getAttribute('role')).toBe('list');
  });

  it('gives each chip the class its layout rules hang off', () => {
    const { container } = renderAttachments(ATTACHMENTS);

    chipsIn(container).forEach((chip) => {
      expect(chip.className).toContain('cds-aichat--message-attachments__chip');
    });
  });

  it('renders nothing when there are no attachments', () => {
    const { container } = renderAttachments([]);

    expect(container.querySelector('ul')).toBeNull();
    expect(chipsIn(container)).toHaveLength(0);
  });
});

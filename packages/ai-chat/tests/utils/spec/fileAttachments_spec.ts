/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `getMessageFileAttachments` reduces the `file`-typed fields on a message's
 * structured data to what the bubble renders. `StructuredField.value` is `unknown`
 * and entirely host-supplied, so the contract these tests pin is: recognize the two
 * documented shapes, skip everything else, and never throw — the render site has no
 * error boundary above it that would preserve the rest of the transcript.
 */

import {
  getMessageFileAttachments,
  shouldSendSilently,
} from '../../../src/chat/utils/fileAttachments';
import { deepFreeze } from '../../../src/chat/utils/lang/objectUtils';
import type { StructuredData } from '../../../src/types/messaging/Messages';

function fileField(value: unknown, id = 'file'): StructuredData {
  return { fields: [{ id, type: 'file', value }] } as StructuredData;
}

describe('getMessageFileAttachments', () => {
  describe('external file references', () => {
    it('maps a reference to name and mime type', () => {
      const result = getMessageFileAttachments(
        fileField({
          type: 'reference',
          id: 'doc-1',
          name: 'report.pdf',
          mime_type: 'application/pdf',
        })
      );

      expect(result).toEqual([
        { id: 'doc-1', name: 'report.pdf', mimeType: 'application/pdf' },
      ]);
    });

    it('carries the url as a preview source, but never the size', () => {
      const [attachment] = getMessageFileAttachments(
        fileField({
          type: 'reference',
          id: 'doc-1',
          name: 'report.pdf',
          mime_type: 'application/pdf',
          url: 'https://example.com/report.pdf',
          size: 248913,
        })
      );

      expect(attachment.url).toBe('https://example.com/report.pdf');
      expect(attachment).not.toHaveProperty('size');
    });

    it('falls back to a field-derived id when the reference has none', () => {
      const [attachment] = getMessageFileAttachments(
        fileField({ type: 'reference', name: 'report.pdf' }, 'attachments')
      );

      expect(attachment.id).toBe('attachments:0');
    });
  });

  describe('inline files', () => {
    it('reads name and mime type off a live File, and carries the File itself', () => {
      const file = new File(['x'], 'notes.txt', { type: 'text/plain' });

      const result = getMessageFileAttachments(
        fileField({ type: 'inline', id: 'i1', file })
      );

      // The File rides along so the chip can preview an image or video from it —
      // the message already holds it, so nothing new is retained.
      expect(result).toEqual([
        { id: 'i1', name: 'notes.txt', mimeType: 'text/plain', file },
      ]);
    });

    it('survives a File that did not serialize into history, with no name', () => {
      // A raw File cannot round-trip through a HistoryItem: JSON.stringify yields
      // `{}`. The attachment still renders, using the element's fallback label.
      const result = getMessageFileAttachments(
        fileField({ type: 'inline', id: 'i1', file: {} })
      );

      expect(result).toEqual([
        { id: 'i1', name: undefined, mimeType: undefined, file: undefined },
      ]);
    });

    it('drops a non-File husk rather than handing it to the chip', () => {
      const [attachment] = getMessageFileAttachments(
        fileField({ type: 'inline', id: 'i1', file: { name: 'notes.txt' } })
      );

      expect(attachment.file).toBeUndefined();
    });
  });

  describe('array-valued fields', () => {
    it('returns one attachment per element', () => {
      const result = getMessageFileAttachments(
        fileField([
          { type: 'reference', id: 'a', name: 'a.pdf' },
          { type: 'reference', id: 'b', name: 'b.pdf' },
        ])
      );

      expect(result.map((a) => a.id)).toEqual(['a', 'b']);
    });

    it('skips a malformed element and keeps the rest', () => {
      const result = getMessageFileAttachments(
        fileField([
          { type: 'reference', id: 'a', name: 'a.pdf' },
          'not a file',
          { type: 'reference', id: 'b', name: 'b.pdf' },
        ])
      );

      expect(result.map((a) => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('values it does not recognize', () => {
    it.each([
      ['a string', 'oops'],
      ['null', null],
      ['a number', 42],
      ['an empty object', {}],
      ['an unknown type discriminant', { type: 'bogus', id: 'x' }],
      ['an undefined value', undefined],
    ])('skips %s without throwing', (_label, value) => {
      expect(() => getMessageFileAttachments(fileField(value))).not.toThrow();
      expect(getMessageFileAttachments(fileField(value))).toEqual([]);
    });
  });

  describe('fields that are not file fields', () => {
    it('ignores mention, command, untyped, and unknown field types', () => {
      const structuredData = {
        fields: [
          { id: 'm', type: 'mention', value: { id: 'u1' } },
          { id: 'c', type: 'command', value: { id: 'c1' } },
          { id: 'n', value: { type: 'reference', id: 'skipped' } },
          { id: 'r', type: 'radio', value: { type: 'reference', id: 'nope' } },
        ],
      } as StructuredData;

      expect(getMessageFileAttachments(structuredData)).toEqual([]);
    });

    it('keeps the file field alongside non-file fields', () => {
      const structuredData = {
        fields: [
          { id: 'm', type: 'mention', value: { id: 'u1' } },
          {
            id: 'file',
            type: 'file',
            value: { type: 'reference', id: 'doc-1', name: 'report.pdf' },
          },
        ],
      } as StructuredData;

      expect(
        getMessageFileAttachments(structuredData).map((a) => a.id)
      ).toEqual(['doc-1']);
    });
  });

  describe('empty input', () => {
    it.each([
      ['undefined', undefined],
      ['an empty object', {} as StructuredData],
      ['an empty fields array', { fields: [] } as StructuredData],
    ])('returns an empty array for %s', (_label, structuredData) => {
      expect(getMessageFileAttachments(structuredData)).toEqual([]);
    });
  });

  it('reads a frozen payload without throwing', () => {
    // History messages are deep-frozen after HISTORY_BEGIN, so the helper only
    // ever reads restored structured data.
    const structuredData = fileField({
      type: 'reference',
      id: 'doc-1',
      name: 'report.pdf',
      mime_type: 'application/pdf',
    });
    deepFreeze(structuredData);

    expect(() => getMessageFileAttachments(structuredData)).not.toThrow();
    expect(getMessageFileAttachments(structuredData)).toHaveLength(1);
    expect(Object.isFrozen(structuredData)).toBe(true);
  });
});

/**
 * The silent default behind `useInputCallbacks.onSendInput`. A send with nothing to
 * show is marked silent so it does not render an empty bubble; a file with no
 * caption has a chip to show, so it must not be.
 */
describe('shouldSendSilently', () => {
  const REFERENCE = {
    type: 'reference',
    id: 'doc-1',
    name: 'report.pdf',
    mime_type: 'application/pdf',
  };

  it('is silent with neither text nor attachments', () => {
    expect(shouldSendSilently('', undefined)).toBe(true);
  });

  it('is not silent with attachments and no text', () => {
    expect(shouldSendSilently('', fileField(REFERENCE))).toBe(false);
  });

  it('is not silent with text and no attachments', () => {
    expect(shouldSendSilently('Here it is.', undefined)).toBe(false);
  });

  it('is not silent with both', () => {
    expect(shouldSendSilently('Here it is.', fileField(REFERENCE))).toBe(false);
  });

  it('is silent when structured data carries no file field', () => {
    // A host can park its own fields on structured_data. Those are not something
    // the bubble renders, so they do not make an empty message visible.
    const hostData = {
      fields: [{ id: 'm', type: 'mention', value: { id: 'u1' } }],
    } as StructuredData;

    expect(shouldSendSilently('', hostData)).toBe(true);
  });

  it('is silent when the only file field is malformed', () => {
    // Nothing renders for a value the chat cannot read, so an empty bubble is
    // still the wrong outcome.
    expect(shouldSendSilently('', fileField('oops'))).toBe(true);
  });
});

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The two predicates behind the Send control. They live in a plain module because
 * the Send control sits inside three nested shadow roots, where a store-driven
 * prop change does not flush reliably in jsdom — so the rules are pinned by
 * calling them rather than by driving the button.
 */

import {
  hasInFlightUpload,
  hasSendableInput,
} from '../../../src/chat/utils/sendableInput';
import { FileStatusValue } from '../../../src/types/config/ServiceDeskConfig';
import type { FileUpload } from '../../../src/types/config/ServiceDeskConfig';

function upload(
  status: FileStatusValue,
  overrides: Partial<FileUpload> = {}
): FileUpload {
  return {
    id: 'upload-1',
    file: new File(['x'], 'report.pdf', { type: 'application/pdf' }),
    status,
    ...overrides,
  } as FileUpload;
}

describe('hasSendableInput', () => {
  it('is false for an empty composer', () => {
    expect(hasSendableInput('', [])).toBe(false);
  });

  it('is false for whitespace alone', () => {
    expect(hasSendableInput('   ', [])).toBe(false);
  });

  it('is true for text', () => {
    expect(hasSendableInput('Here it is.', [])).toBe(true);
  });

  it('is true for a staged file with no text', () => {
    expect(hasSendableInput('', [upload(FileStatusValue.COMPLETE)])).toBe(true);
  });

  it('is true while a file is still uploading', () => {
    // Sendable content, but not yet sendable — `hasInFlightUpload` holds the
    // control disabled until the transfer lands.
    expect(hasSendableInput('', [upload(FileStatusValue.UPLOADING)])).toBe(
      true
    );
  });

  it('is false when every staged file errored', () => {
    expect(
      hasSendableInput('', [
        upload(FileStatusValue.EDIT, { isError: true }),
        upload(FileStatusValue.EDIT, { isError: true }),
      ])
    ).toBe(false);
  });

  it('is true when one staged file survived', () => {
    expect(
      hasSendableInput('', [
        upload(FileStatusValue.EDIT, { isError: true }),
        upload(FileStatusValue.COMPLETE),
      ])
    ).toBe(true);
  });

  it('is false with no uploads array at all', () => {
    // The Input only receives `pendingUploads` when uploads are configured.
    expect(hasSendableInput('', undefined)).toBe(false);
  });
});

describe('hasInFlightUpload', () => {
  it('is true while a file is transferring', () => {
    expect(hasInFlightUpload([upload(FileStatusValue.UPLOADING)])).toBe(true);
  });

  it('is true when any one of several is transferring', () => {
    expect(
      hasInFlightUpload([
        upload(FileStatusValue.COMPLETE),
        upload(FileStatusValue.UPLOADING),
      ])
    ).toBe(true);
  });

  it('is false once every upload has landed', () => {
    expect(
      hasInFlightUpload([
        upload(FileStatusValue.COMPLETE),
        upload(FileStatusValue.EDIT),
      ])
    ).toBe(false);
  });

  it.each([
    ['an empty array', []],
    ['no uploads array at all', undefined],
  ])('is false for %s', (_label, uploads) => {
    expect(hasInFlightUpload(uploads as FileUpload[] | undefined)).toBe(false);
  });
});

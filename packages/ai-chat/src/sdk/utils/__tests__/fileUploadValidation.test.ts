/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { validateFileSelection } from '../fileUploadValidation';

function fileOfSize(bytes: number, name = 'file.bin', type = ''): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('validateFileSelection', () => {
  it('rejects files larger than maxFileSizeBytes', () => {
    const small = fileOfSize(100, 'small.txt');
    const big = fileOfSize(5000, 'big.txt');
    const result = validateFileSelection([small, big], 0, {
      maxFileSizeBytes: 1024,
    });
    expect(result.accepted).toEqual([small]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe('fileSharing_fileTooLarge');
    expect(result.rejections[0].messageValues?.maxSize).toBe('1 KB');
  });

  it('rejects unsupported types and reports the filename', () => {
    // No extension, so only the exact MIME token can accept it.
    const pdf = fileOfSize(10, 'doc', 'application/pdf');
    const exe = fileOfSize(10, 'bad.exe', 'application/octet-stream');
    const result = validateFileSelection([pdf, exe], 0, {
      accept: 'application/pdf,.pdf',
    });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe('fileSharing_unsupportedType');
    expect(result.rejections[0].messageValues?.filename).toBe('bad.exe');
  });
});

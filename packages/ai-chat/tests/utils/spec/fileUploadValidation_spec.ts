/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { validateFileSelection } from "../../../src/chat/utils/fileUploadValidation";

function fileOfSize(bytes: number, name = "file.bin", type = ""): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateFileSelection", () => {
  it("accepts everything when no limits are configured", () => {
    const files = [fileOfSize(10, "a.txt"), fileOfSize(20, "b.png")];
    const result = validateFileSelection(files, 0, {});
    expect(result.accepted).toEqual(files);
    expect(result.rejections).toEqual([]);
  });

  it("rejects files larger than maxFileSizeBytes", () => {
    const small = fileOfSize(100, "small.txt");
    const big = fileOfSize(5000, "big.txt");
    const result = validateFileSelection([small, big], 0, {
      maxFileSizeBytes: 1024,
    });
    expect(result.accepted).toEqual([small]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe("fileSharing_fileTooLarge");
    expect(result.rejections[0].messageValues?.maxSize).toBe("1 KB");
  });

  it("rejects unsupported types and reports the filename", () => {
    const pdf = fileOfSize(10, "doc.pdf", "application/pdf");
    const exe = fileOfSize(10, "bad.exe", "application/octet-stream");
    const result = validateFileSelection([pdf, exe], 0, {
      accept: "application/pdf,.pdf",
    });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe("fileSharing_unsupportedType");
    expect(result.rejections[0].messageValues?.filename).toBe("bad.exe");
  });

  it("matches MIME wildcards in accept", () => {
    const png = fileOfSize(10, "a.png", "image/png");
    const txt = fileOfSize(10, "a.txt", "text/plain");
    const result = validateFileSelection([png, txt], 0, { accept: "image/*" });
    expect(result.accepted).toEqual([png]);
    expect(result.rejections[0].messageID).toBe("fileSharing_unsupportedType");
  });

  it("matches by file extension in accept", () => {
    const pdf = fileOfSize(10, "report.PDF", "");
    const result = validateFileSelection([pdf], 0, { accept: ".pdf" });
    expect(result.accepted).toEqual([pdf]);
    expect(result.rejections).toEqual([]);
  });

  it("rejects the overflow past maxFiles with a single announcement", () => {
    const files = [
      fileOfSize(1, "a.txt"),
      fileOfSize(1, "b.txt"),
      fileOfSize(1, "c.txt"),
    ];
    const result = validateFileSelection(files, 0, { maxFiles: 2 });
    expect(result.accepted).toHaveLength(2);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe("fileSharing_tooManyFiles");
    expect(result.rejections[0].messageValues?.maxFiles).toBe(2);
  });

  it("counts files already pending against maxFiles", () => {
    const files = [fileOfSize(1, "a.txt"), fileOfSize(1, "b.txt")];
    const result = validateFileSelection(files, 1, { maxFiles: 2 });
    expect(result.accepted).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe("fileSharing_tooManyFiles");
  });

  it("does not consume the count budget with invalid files", () => {
    const tooBig = fileOfSize(5000, "big.txt");
    const ok = fileOfSize(1, "ok.txt");
    const result = validateFileSelection([tooBig, ok], 0, {
      maxFiles: 1,
      maxFileSizeBytes: 1024,
    });
    // The oversize file is rejected for size, so the small file still fits.
    expect(result.accepted).toEqual([ok]);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0].messageID).toBe("fileSharing_fileTooLarge");
  });
});

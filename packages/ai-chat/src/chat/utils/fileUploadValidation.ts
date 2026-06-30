/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { LanguagePack } from "../../types/config/LanguagePack";

/**
 * The size/type/count limits a file selection is validated against. Each field
 * is optional; an undefined limit is not enforced.
 */
interface FileUploadValidationConfig {
  /** Accepted types, in HTML `accept` format (MIME types, `type/*`, `.ext`). */
  accept?: string;
  /** Maximum size in bytes for a single file. */
  maxFileSizeBytes?: number;
  /** Maximum number of files that may be attached at once. */
  maxFiles?: number;
}

/** A rejected file, expressed as the language-pack message to announce. */
interface FileUploadRejection {
  messageID: keyof LanguagePack;
  messageValues?: Record<string, any>;
}

interface FileUploadValidationResult {
  /** Files that passed every check, in selection order. */
  accepted: File[];
  /** One entry per rejection reason, ready to announce assertively. */
  rejections: FileUploadRejection[];
}

/**
 * Validate a freshly-selected set of files against the configured limits.
 *
 * Runs client-side before a file is handed to the upload pipeline so we can
 * reject (and announce) too-large, unsupported-type, and over-the-limit files
 * the native `accept` attribute and the upload button can't catch on their own
 * (drag-and-drop and multi-select bypass them). Pure — no React or store
 * access — so it is trivially unit-testable.
 */
function validateFileSelection(
  files: File[],
  existingCount: number,
  config: FileUploadValidationConfig,
): FileUploadValidationResult {
  const { accept, maxFileSizeBytes, maxFiles } = config;
  const allowedTypes = parseAccept(accept);

  const accepted: File[] = [];
  const rejections: FileUploadRejection[] = [];
  let count = existingCount;
  let tooMany = false;

  for (const file of files) {
    if (maxFiles !== undefined && count >= maxFiles) {
      tooMany = true;
      continue;
    }
    if (allowedTypes && !matchesAccept(file, allowedTypes)) {
      rejections.push({
        messageID: "fileSharing_unsupportedType",
        messageValues: { filename: file.name },
      });
      continue;
    }
    if (maxFileSizeBytes !== undefined && file.size > maxFileSizeBytes) {
      rejections.push({
        messageID: "fileSharing_fileTooLarge",
        messageValues: { maxSize: formatBytes(maxFileSizeBytes) },
      });
      continue;
    }
    accepted.push(file);
    count += 1;
  }

  // One announcement for the whole overflow rather than one per dropped file.
  if (tooMany) {
    rejections.push({
      messageID: "fileSharing_tooManyFiles",
      messageValues: { maxFiles },
    });
  }

  return { accepted, rejections };
}

/** Split an `accept` string into lower-cased, non-empty tokens. */
function parseAccept(accept?: string): string[] | null {
  if (!accept) {
    return null;
  }
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  return tokens.length ? tokens : null;
}

/** Whether a file matches any token of a parsed `accept` list. */
function matchesAccept(file: File, tokens: string[]): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) {
      return name.endsWith(token);
    }
    if (token.endsWith("/*")) {
      return type.startsWith(token.slice(0, -1));
    }
    return type === token;
  });
}

/** Format a byte count as a short human-readable size (e.g. "5 MB"). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded =
    Number.isInteger(value) || value >= 10
      ? Math.round(value)
      : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export { validateFileSelection };
export type {
  FileUploadValidationConfig,
  FileUploadRejection,
  FileUploadValidationResult,
};

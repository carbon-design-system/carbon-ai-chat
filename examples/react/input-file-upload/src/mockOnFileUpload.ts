/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock onFileUpload handler for the file-upload example.
 *
 * Demonstrates: implementing `UploadConfig.onFileUpload` to simulate a
 * server-side upload and returning a `StructuredData` payload containing
 * an `ExternalFileReference`, plus a companion responder that echoes
 * received file metadata back to the user.
 *
 * APIs exercised:
 *   - `StructuredData`
 *   - `StructuredField`
 *   - `ExternalFileReference`
 *   - `ChatInstance.messaging.addMessage`
 *   - `MessageResponseTypes.TEXT`
 *
 * Start reading at: the `mockOnFileUpload` function below.
 */

import {
  ChatInstance,
  ExternalFileReference,
  MessageRequest,
  MessageResponseTypes,
  StructuredData,
  StructuredField,
} from "@carbon/ai-chat";
import { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";

/**
 * Mock `UploadConfig.onFileUpload` handler.
 *
 * Simulates a 1-second server-side upload, then returns a {@link StructuredData}
 * containing an {@link ExternalFileReference} with the file's metadata.
 *
 * In a real integration this function would POST the file to a backend and
 * return the server-assigned reference instead.
 */
// Replace with a real production implementation.
async function mockOnFileUpload(
  file: File,
  abortSignal: AbortSignal,
): Promise<StructuredData> {
  // Honour `abortSignal` so the host can cancel an in-flight upload (mirrors a real fetch).
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 1000);

    abortSignal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Upload aborted", "AbortError"));
      },
      { once: true },
    );
  });

  // A real backend returns its own server-assigned id; here we synthesise one client-side.
  const reference: ExternalFileReference = {
    type: "reference",
    id: uuid(),
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
  };

  // The returned StructuredData is merged into the next outgoing user message as a `file` field.
  const contributedData: StructuredData = {
    fields: [
      {
        id: "file",
        type: "file",
        value: reference,
      } satisfies StructuredField,
    ],
  };

  return contributedData;
}

/**
 * Formats a file size in bytes into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 bytes";
  }
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mock server response handler for messages that contain file attachments.
 *
 * Inspects `request.input.structured_data` for `file`-typed fields and
 * responds with a text message summarising the metadata of every file
 * received — simulating what a real backend might echo back.
 */
// Replace with a real production implementation.
function doFileUploadResponse(
  request: MessageRequest,
  instance: ChatInstance,
): void {
  const fields = request.input.structured_data?.fields ?? [];
  const fileFields = fields.filter((f) => f.type === "file");

  if (fileFields.length === 0) {
    return;
  }

  // A `file` field's `value` may hold either one ExternalFileReference or an array of them; normalise both shapes.
  const refs: ExternalFileReference[] = [];
  for (const field of fileFields) {
    const value = field.value;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v && typeof v === "object" && v.type === "reference") {
          refs.push(v as ExternalFileReference);
        }
      }
    } else if (
      value &&
      typeof value === "object" &&
      (value as ExternalFileReference).type === "reference"
    ) {
      refs.push(value as ExternalFileReference);
    }
  }

  if (refs.length === 0) {
    return;
  }

  const lines: string[] = [
    refs.length === 1
      ? "📎 **File received by the mock server:**"
      : `📎 **${refs.length} files received by the mock server:**`,
    "",
  ];

  for (const ref of refs) {
    lines.push(`**${ref.name ?? "unnamed"}**`);
    lines.push(`- Server ID: \`${ref.id}\``);
    if (ref.mime_type) {
      lines.push(`- Type: ${ref.mime_type}`);
    }
    if (ref.size !== undefined) {
      lines.push(`- Size: ${formatBytes(ref.size)}`);
    }
    lines.push("");
  }

  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: lines.join("\n").trimEnd(),
        },
      ],
    },
  });
}

export { mockOnFileUpload, doFileUploadResponse };
